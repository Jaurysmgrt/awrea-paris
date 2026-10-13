/**
 * Accès au tableau de bord Atelier : mot de passe (ATELIER_PASSWORD), puis double authentification
 * obligatoire → cookie signé de 12 h. Chaque session porte une « génération » : la changer
 * (réinitialisation de la double authentification, « déconnecter tous les appareils »)
 * ferme aussitôt toutes les sessions ouvertes.
 * Sans mot de passe configuré, l'accès de démonstration « atelier-demo » n'est permis qu'en
 * démonstration (aucune boutique Shopify branchée) et jamais sur le site de production.
 */
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "@/lib/store";
import { sign, verify } from "./session";

export const ADMIN_COOKIE = "awrea_admin";
/** étape intermédiaire : mot de passe validé, code de double authentification attendu */
export const ADMIN_PRE_COOKIE = "awrea_admin_pre";
const MAX_AGE = 60 * 60 * 12;
const PRE_MAX_AGE = 60 * 5;
/** limitation des tentatives : 8 échecs (mot de passe ou code) par adresse IP et par quart d'heure */
export const ADMIN_LOGIN_GUARD = { limit: 8, windowSeconds: 15 * 60 };

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

export function checkPassword(input: string): boolean {
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

export async function adminToken(): Promise<string> {
  return sign({ role: "atelier", g: await sessionGeneration() }, MAX_AGE);
}

export async function isAdminToken(token: string | undefined | null): Promise<boolean> {
  const payload = verify<{ role: string; g?: number }>(token);
  return payload?.role === "atelier" && (payload.g ?? 0) === (await sessionGeneration());
}

export async function isAdmin(): Promise<boolean> {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function setAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, await adminToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function clearAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function setPreAuthCookie() {
  (await cookies()).set(ADMIN_PRE_COOKIE, sign({ stage: "password" }, PRE_MAX_AGE), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/gestion/login",
    maxAge: PRE_MAX_AGE,
  });
}

export async function hasPreAuth(): Promise<boolean> {
  return verify<{ stage: string }>((await cookies()).get(ADMIN_PRE_COOKIE)?.value)?.stage === "password";
}

export async function clearPreAuth() {
  (await cookies()).set(ADMIN_PRE_COOKIE, "", { path: "/api/gestion/login", maxAge: 0 });
}
