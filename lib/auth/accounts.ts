/**
 * Comptes autorisés de l'Atelier.
 *
 * Peuvent entrer : les adresses listées dans ATELIER_ACCOUNTS (séparées par des virgules ; à
 * défaut, l'adresse ATELIER_EMAIL, puis celle de la Maison), et les personnes que la propriétaire
 * (la première de ces adresses) a ajoutées depuis l'Atelier (lib/auth/personnes.ts, demande du 09/11).
 * Chaque compte a son propre mot de passe (scrypt, jamais stocké en clair) et sa propre double
 * authentification (TOTP chiffré, codes de secours à usage unique).
 *
 * Première connexion : pour une adresse de Vercel, le mot de passe d'installation (ATELIER_PASSWORD,
 * connu de la seule propriétaire) ; pour une personne ajoutée, son code d'invitation à usage unique.
 * Il ouvre la création du mot de passe personnel, puis l'enrôlement de la double authentification.
 * Ensuite, seul le mot de passe personnel est accepté. Une personne retirée ne peut plus entrer, et
 * ses sessions ouvertes cessent aussitôt (lib/auth/admin.ts vérifie l'adresse à chaque requête).
 *
 * Blocage : cinq échecs (mot de passe ou code) bloquent l'adresse pour une demi-heure et préviennent
 * sa titulaire par e-mail ; une adresse inconnue est traitée de la même façon (rien ne révèle quels
 * comptes existent). La limitation par adresse IP s'ajoute à ce blocage.
 */
import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { base32Encode, decryptSecret, encryptSecret, hashRecoveryCode, matchCounter, otpauthUri } from "./totp";
import { personnesAjoutees } from "./personnes";

/** blocage d'une adresse : cinq échecs (mot de passe ou code) par demi-heure, comptés même pour une adresse inconnue */
export const ACCOUNT_GUARD = { limit: 5, windowSeconds: 30 * 60 };

/** identifiant de blocage d'une adresse (jamais l'adresse en clair dans les clés) */
export const emailKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);

/** Clé d'accès (Face ID, empreinte, code de l'appareil) : lib/auth/passkeys.ts. */
export interface Passkey {
  /** identifiant de la clé (base64url) */
  id: string;
  /** clé publique COSE (base64url) : la clé privée ne quitte jamais l'appareil */
  publicKey: string;
  counter: number;
  transports?: string[];
  /** appareil sur lequel elle a été créée (« Safari · iOS ») */
  label: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AtelierAccount {
  email: string;
  passwordHash?: string;
  totp?: { secret: string; createdAt: string; lastCounter: number; recovery: string[] };
  passkeys?: Passkey[];
  createdAt: string;
  lastLoginAt?: string;
}

const ACCOUNTS_KEY = "atelier:accounts";
const enrollKey = (email: string) => `atelier:enroll:${email}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Adresses réglées dans Vercel (ATELIER_ACCOUNTS), en minuscules : elles ne se retirent pas depuis l'Atelier. */
export function allowedEmails(): string[] {
  const raw = process.env.ATELIER_ACCOUNTS || process.env.ATELIER_EMAIL || identity.email;
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
}

/** La propriétaire : la première adresse de Vercel, seule à pouvoir ajouter ou retirer une personne. */
export const proprietaire = (): string | null => allowedEmails()[0] ?? null;

/** Toutes les adresses qui peuvent entrer : celles de Vercel, puis les personnes ajoutées. */
export async function adressesAutorisees(): Promise<string[]> {
  const vercel = allowedEmails();
  const ajoutees = (await personnesAjoutees().catch(() => [])).map((p) => p.email).filter((e) => !vercel.includes(e));
  return [...vercel, ...ajoutees];
}

/** L'adresse peut-elle entrer ? Lue à chaque requête : une personne retirée ne passe plus. */
export async function estAutorisee(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (allowedEmails().includes(e)) return true;
  return (await personnesAjoutees().catch(() => [])).some((p) => p.email === e);
}

async function all(): Promise<Record<string, AtelierAccount>> {
  return (await kv.get<Record<string, AtelierAccount>>(ACCOUNTS_KEY)) ?? {};
}

export async function getAccount(email: string): Promise<AtelierAccount | null> {
  const e = email.trim().toLowerCase();
  if (!(await estAutorisee(e))) return null;
  return (await all())[e] ?? { email: e, createdAt: new Date().toISOString() };
}

export async function saveAccount(a: AtelierAccount) {
  const list = await all();
  await kv.set(ACCOUNTS_KEY, { ...list, [a.email]: a });
}

/** Tous les comptes autorisés, avec leur état (pour les Réglages). */
export async function listAccounts(): Promise<AtelierAccount[]> {
  const [list, adresses] = await Promise.all([all(), adressesAutorisees()]);
  return adresses.map((e) => list[e] ?? { email: e, createdAt: "" });
}

/** Efface le compte d'une personne retirée : mot de passe, double authentification et Face ID. */
export async function supprimerCompte(email: string) {
  const e = email.trim().toLowerCase();
  const list = await all();
  if (e in list) {
    const { [e]: _retire, ...reste } = list;
    void _retire;
    await kv.set(ACCOUNTS_KEY, reste);
  }
  await kv.del(enrollKey(e));
}

// ------------------------------------------------------------------ mots de passe
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize("NFC"), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function checkAccountPassword(a: AtelierAccount, pw: string): Promise<boolean> {
  if (!a.passwordHash) return false;
  const [algo, N, r, p, salt, hash] = a.passwordHash.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(pw.normalize("NFC"), Buffer.from(salt, "base64url"), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Règles d'un mot de passe personnel : douze caractères au moins, pas le mot de passe d'installation. */
export function passwordProblem(pw: string, setupPassword: string | null): string | null {
  if (pw.length < 12) return "Choisissez au moins douze caractères. Une courte phrase se retient mieux qu’un mot compliqué.";
  if (pw.length > 200) return "Ce mot de passe est trop long.";
  if (setupPassword && pw === setupPassword) return "Choisissez un mot de passe différent du mot de passe d’installation.";
  return null;
}

// ------------------------------------------------------------------ double authentification
/** Secret actif du compte (ATELIER_TOTP_SECRET l'impose à tous les comptes : tests seulement). */
function secretOf(a: AtelierAccount): string | null {
  if (process.env.ATELIER_TOTP_SECRET) return process.env.ATELIER_TOTP_SECRET.replace(/\s/g, "").toUpperCase();
  if (!a.totp) return null;
  try {
    return decryptSecret(a.totp.secret);
  } catch {
    return null; // SESSION_SECRET changé : il faudra refaire l'enrôlement
  }
}

export const hasTotp = (a: AtelierAccount) => Boolean(secretOf(a));

/** Vérifie un code de l'application, ou un code de secours (consommé). Un code déjà utilisé est refusé. */
export async function verifyAccountCode(a: AtelierAccount, code: string): Promise<boolean> {
  const secret = secretOf(a);
  if (!secret) return false;
  const t = a.totp ?? { secret: "", createdAt: new Date().toISOString(), lastCounter: -1, recovery: [] };
  const clean = code.trim();
  const counter = matchCounter(secret, clean);
  if (counter !== null) {
    if (counter <= t.lastCounter) return false;
    await saveAccount({ ...a, totp: { ...t, lastCounter: counter } });
    return true;
  }
  const h = hashRecoveryCode(clean);
  if (t.recovery.includes(h)) {
    await saveAccount({ ...a, totp: { ...t, recovery: t.recovery.filter((x) => x !== h) } });
    return true;
  }
  return false;
}

export async function startAccountEnrollment(a: AtelierAccount): Promise<{ secret: string; uri: string }> {
  const secret = base32Encode(randomBytes(20));
  await kv.set(enrollKey(a.email), { secret: encryptSecret(secret), exp: Date.now() + 10 * 60 * 1000 });
  return { secret, uri: otpauthUri(secret, a.email) };
}

export async function confirmAccountEnrollment(a: AtelierAccount, code: string): Promise<string[] | null> {
  const pending = await kv.get<{ secret: string; exp: number }>(enrollKey(a.email));
  if (!pending || pending.exp < Date.now()) return null;
  const secret = decryptSecret(pending.secret);
  const counter = matchCounter(secret, code.trim());
  if (counter === null) return null;
  const recovery = Array.from({ length: 8 }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  await saveAccount({ ...a, totp: { secret: encryptSecret(secret), createdAt: new Date().toISOString(), lastCounter: counter, recovery: recovery.map(hashRecoveryCode) } });
  await kv.del(enrollKey(a.email));
  return recovery;
}

/** Remise à zéro d'un compte : mot de passe et double authentification à refaire (mot de passe d'installation). */
export async function resetAccount(email: string) {
  const a = await getAccount(email);
  if (!a) return;
  await saveAccount({ email: a.email, createdAt: a.createdAt });
  await kv.del(enrollKey(a.email));
}

/** Nouveau téléphone : la double authentification du compte est à refaire, le mot de passe reste. */
export async function resetAccountTotp(email: string) {
  const a = await getAccount(email);
  if (!a) return;
  await saveAccount({ ...a, totp: undefined });
  await kv.del(enrollKey(a.email));
}

/** Codes de secours restants d'un compte. */
export const recoveryLeft = (a: AtelierAccount) => a.totp?.recovery.length ?? 0;
