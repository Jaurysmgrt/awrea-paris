/**
 * Accès à l'Atelier (tableau de bord et éditeur visuel).
 *
 * Seuls les comptes autorisés entrent (lib/auth/accounts.ts) : adresse e-mail et mot de passe
 * personnel, puis double authentification obligatoire, puis cookie signé de 12 h qui porte
 * l'adresse du compte. Chaque session porte une « génération » : la changer (réinitialisation,
 * « fermer toutes les sessions », lien « ce n'était pas moi ») ferme aussitôt toutes les sessions.
 *
 * Mot de passe d'installation (ATELIER_PASSWORD) : il ne sert qu'à la première connexion d'un
 * compte autorisé, pour créer son mot de passe personnel. Sans lui, l'accès de démonstration
 * « atelier-demo » n'est permis qu'en démonstration (aucune boutique Shopify branchée) et jamais sur
 * le site de production.
 */
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "@/lib/store";
import { atelierBase, ATELIER_INTERNAL } from "@/lib/admin/path";
import { isAllowed } from "./accounts";
import { sign, verify } from "./session";

export const ADMIN_COOKIE = "awrea_admin";
/** étape intermédiaire : mot de passe validé, code de double authentification attendu */
export const ADMIN_PRE_COOKIE = "awrea_admin_pre";
const MAX_AGE = 60 * 60 * 12;
const PRE_MAX_AGE = 60 * 10;
/** limitation des tentatives : 8 échecs (mot de passe ou code) par adresse IP et par quart d'heure */
export const ADMIN_LOGIN_GUARD = { limit: 8, windowSeconds: 15 * 60 };

/** Mot de passe d'installation (première connexion d'un compte autorisé). */
export function adminPassword(): string | null {
  if (process.env.ATELIER_PASSWORD) return process.env.ATELIER_PASSWORD;
  // jamais de mot de passe de démonstration en production : sinon, une inconnue pourrait
  // se connecter la première et enregistrer sa propre double authentification
  if (!process.env.SHOPIFY_STORE_DOMAIN && process.env.VERCEL_ENV !== "production") return "atelier-demo";
  return null;
}

export function usingDemoPassword() {
  return !process.env.ATELIER_PASSWORD;
}

export function checkSetupPassword(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const GENERATION_KEY = "security:admin-generation";

export async function sessionGeneration(): Promise<number> {
  return (await kv.get<number>(GENERATION_KEY).catch(() => null)) ?? 0;
}

/** Ferme toutes les sessions de l'Atelier, sur tous les appareils. */
export async function revokeAdminSessions() {
  await kv.set(GENERATION_KEY, (await sessionGeneration()) + 1);
}

interface AdminPayload {
  role: string;
  email?: string;
  g?: number;
}

export async function adminToken(email: string): Promise<string> {
  return sign({ role: "atelier", email, g: await sessionGeneration() }, MAX_AGE);
}

async function adminPayload(token: string | undefined | null): Promise<AdminPayload | null> {
  const payload = verify<AdminPayload>(token);
  if (payload?.role !== "atelier" || !payload.email || !isAllowed(payload.email)) return null;
  return (payload.g ?? 0) === (await sessionGeneration()) ? payload : null;
}

export async function isAdminToken(token: string | undefined | null): Promise<boolean> {
  return Boolean(await adminPayload(token));
}

export async function isAdmin(): Promise<boolean> {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Adresse du compte connecté, ou null. */
export async function currentAdmin(): Promise<string | null> {
  return (await adminPayload((await cookies()).get(ADMIN_COOKIE)?.value))?.email ?? null;
}

const secure = () => process.env.NODE_ENV === "production";
/** chemin public des routes de connexion (le cookie intermédiaire ne sort jamais de là) */
const loginPath = () => `${atelierBase() ?? ATELIER_INTERNAL}/api/login`;

export async function setAdminCookie(email: string) {
  (await cookies()).set(ADMIN_COOKIE, await adminToken(email), { httpOnly: true, sameSite: "strict", secure: secure(), path: "/", maxAge: MAX_AGE });
}

export async function clearAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}

export type PreAuthStage = "setup" | "enroll" | "totp";

export async function setPreAuthCookie(email: string, stage: PreAuthStage) {
  (await cookies()).set(ADMIN_PRE_COOKIE, sign({ email, stage }, PRE_MAX_AGE), { httpOnly: true, sameSite: "strict", secure: secure(), path: loginPath(), maxAge: PRE_MAX_AGE });
}

/** Étape en cours de la connexion (mot de passe déjà vérifié), ou null. */
export async function preAuth(): Promise<{ email: string; stage: PreAuthStage } | null> {
  const p = verify<{ email: string; stage: PreAuthStage }>((await cookies()).get(ADMIN_PRE_COOKIE)?.value);
  return p?.email && isAllowed(p.email) ? p : null;
}

export async function clearPreAuth() {
  (await cookies()).set(ADMIN_PRE_COOKIE, "", { path: loginPath(), maxAge: 0 });
}
