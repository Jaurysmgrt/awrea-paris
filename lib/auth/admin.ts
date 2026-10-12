/**
 * Accès au tableau de bord Atelier : mot de passe (ATELIER_PASSWORD) → cookie signé 12 h.
 * Sans mot de passe configuré, l'accès de démonstration « atelier-demo » n'est permis
 * qu'en mode démonstration (aucune boutique Shopify branchée).
 */
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sign, verify } from "./session";

export const ADMIN_COOKIE = "awrea_admin";
const MAX_AGE = 60 * 60 * 12;

export function adminPassword(): string | null {
  if (process.env.ATELIER_PASSWORD) return process.env.ATELIER_PASSWORD;
  if (!process.env.SHOPIFY_STORE_DOMAIN) return "atelier-demo";
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

export function adminToken(): string {
  return sign({ role: "atelier" }, MAX_AGE);
}

export function isAdminToken(token: string | undefined | null): boolean {
  return verify<{ role: string }>(token)?.role === "atelier";
}

export async function isAdmin(): Promise<boolean> {
  return isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function setAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}
