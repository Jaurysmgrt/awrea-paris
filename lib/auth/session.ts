/**
 * Jetons de session signés (HMAC-SHA256), sans dépendance.
 * Utilisés pour la session cliente de démonstration et la session du tableau de bord Atelier.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.VERCEL) {
    console.warn("[session] SESSION_SECRET manquant : utilisez une valeur longue et aléatoire en production.");
  }
  return s ?? "awrea-dev-secret-a-remplacer";
};

export function sign<T extends object>(payload: T, maxAgeSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify<T extends object>(token: string | undefined | null): (T & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    if (data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}
