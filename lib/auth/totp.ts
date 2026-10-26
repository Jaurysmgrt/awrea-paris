/**
 * Double authentification de l'Atelier (TOTP, RFC 6238), obligatoire pour chaque compte : mot de
 * passe, puis code à six chiffres d'une application d'authentification (Apple Mots de passe,
 * Google Authenticator, 1Password, Authy…).
 *
 * Ce module fournit le calcul des codes et le chiffrement des secrets (AES-256-GCM, clé dérivée de
 * SESSION_SECRET) ; chaque compte garde son secret et ses codes de secours (lib/auth/accounts.ts).
 */
import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "./session";

const STEP = 30;
const DIGITS = 6;
const ISSUER = "Awrea Paris Atelier";

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

// ------------------------------------------------------------------ chiffrement des secrets
// même règle que les sessions : sur Vercel, jamais de clé par défaut (lib/auth/session.ts)
const cryptoKey = () => createHash("sha256").update(`totp:${sessionSecret()}`).digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(data: string): string {
  const [iv, tag, enc] = data.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", cryptoKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Empreinte d'un code de secours (seule l'empreinte est conservée). */
export const hashRecoveryCode = (code: string) => createHash("sha256").update(code.replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");
