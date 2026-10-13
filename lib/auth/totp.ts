/**
 * Double authentification de l'Atelier (TOTP, RFC 6238) — obligatoire pour accéder au tableau
 * de bord : mot de passe + code à six chiffres d'une application d'authentification
 * (Google Authenticator, Apple Mots de passe, 1Password, Authy…).
 *
 * Le secret est soit fourni par ATELIER_TOTP_SECRET (base32), soit créé à la première
 * connexion (enrôlement par QR code) et conservé chiffré (AES-256-GCM, clé dérivée de
 * SESSION_SECRET). Huit codes de secours à usage unique sont remis à l'enrôlement.
 * Un code déjà utilisé est refusé (pas de rejeu).
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./session";
import { kv } from "@/lib/store";

const STEP = 30;
const DIGITS = 6;
const ISSUER = "Awrea Paris — Atelier";
const KEY = "admin:totp";
const PENDING_KEY = "admin:totp:pending";

interface StoredTotp {
  secret: string; // chiffré
  createdAt: string;
  lastCounter: number;
  recovery: string[]; // empreintes SHA-256 des codes de secours restants
}

// ------------------------------------------------------------------ base32 (RFC 4648)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ------------------------------------------------------------------ TOTP
export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const offset = h[h.length - 1] & 15;
  const code = ((h[offset] & 127) << 24) | (h[offset + 1] << 16) | (h[offset + 2] << 8) | h[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function totp(secretB32: string, time = Date.now()): string {
  return hotp(base32Decode(secretB32), Math.floor(time / 1000 / STEP));
}

/** Compteur correspondant au code (fenêtre ±1 pas, pour un léger décalage d'horloge), ou null. */
export function matchCounter(secretB32: string, code: string, time = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretB32);
  const now = Math.floor(time / 1000 / STEP);
  for (const c of [now, now - 1, now + 1]) {
    const expected = Buffer.from(hotp(secret, c));
    const given = Buffer.from(code);
    if (expected.length === given.length && timingSafeEqual(expected, given)) return c;
  }
  return null;
}

export function otpauthUri(secretB32: string, account = "atelier"): string {
  const label = encodeURIComponent(`${ISSUER}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}

// ------------------------------------------------------------------ stockage chiffré
// même règle que les sessions : sur Vercel, jamais de clé par défaut (lib/auth/session.ts)
const cryptoKey = () => createHash("sha256").update(`totp:${sessionSecret()}`).digest();
function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}
function decrypt(data: string): string {
  const [iv, tag, enc] = data.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", cryptoKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
const hashCode = (code: string) => createHash("sha256").update(code.replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");

async function stored(): Promise<StoredTotp | null> {
  return kv.get<StoredTotp>(KEY);
}

/** Secret actif (variable d'environnement prioritaire). */
async function activeSecret(): Promise<string | null> {
  if (process.env.ATELIER_TOTP_SECRET) return process.env.ATELIER_TOTP_SECRET.replace(/\s/g, "").toUpperCase();
  const s = await stored();
  if (!s) return null;
  try {
    return decrypt(s.secret);
  } catch {
    return null; // SESSION_SECRET changé : il faudra refaire l'enrôlement
  }
}

export async function isEnrolled(): Promise<boolean> {
  return Boolean(await activeSecret());
}

/** Vérifie un code de l'application, ou un code de secours (consommé). */
export async function verifyAdminCode(code: string): Promise<boolean> {
  const secret = await activeSecret();
  if (!secret) return false;
  const s = (await stored()) ?? { secret: "", createdAt: new Date().toISOString(), lastCounter: -1, recovery: [] };
  const clean = code.trim();
  const counter = matchCounter(secret, clean);
  if (counter !== null) {
    if (counter <= s.lastCounter) return false; // code déjà utilisé
    await kv.set(KEY, { ...s, lastCounter: counter });
    return true;
  }
  const h = hashCode(clean);
  if (s.recovery.includes(h)) {
    await kv.set(KEY, { ...s, recovery: s.recovery.filter((x) => x !== h) });
    return true;
  }
  return false;
}

/** Début d'enrôlement : secret provisoire (10 minutes) à scanner. */
export async function startEnrollment(): Promise<{ secret: string; uri: string }> {
  const secret = base32Encode(randomBytes(20));
  await kv.set(PENDING_KEY, { secret: encrypt(secret), exp: Date.now() + 10 * 60 * 1000 });
  return { secret, uri: otpauthUri(secret) };
}

/** Fin d'enrôlement : le code saisi prouve que l'application est bien configurée. */
export async function confirmEnrollment(code: string): Promise<string[] | null> {
  const pending = await kv.get<{ secret: string; exp: number }>(PENDING_KEY);
  if (!pending || pending.exp < Date.now()) return null;
  const secret = decrypt(pending.secret);
  const counter = matchCounter(secret, code.trim());
  if (counter === null) return null;
  const recovery = Array.from({ length: 8 }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  await kv.set<StoredTotp>(KEY, { secret: encrypt(secret), createdAt: new Date().toISOString(), lastCounter: counter, recovery: recovery.map(hashCode) });
  await kv.del(PENDING_KEY);
  return recovery;
}

export async function resetEnrollment() {
  await kv.del(KEY);
  await kv.del(PENDING_KEY);
}

export async function recoveryCodesLeft(): Promise<number> {
  return (await stored())?.recovery.length ?? 0;
}
