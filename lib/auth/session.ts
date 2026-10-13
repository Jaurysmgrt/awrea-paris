/**
 * Jetons de session signés (HMAC-SHA256), sans dépendance.
 * Utilisés pour la session cliente de démonstration et la session du tableau de bord Atelier.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "awrea-dev-secret-a-remplacer";

/**
 * Sur Vercel (production ou prévisualisation), jamais de clé par défaut : la valeur de
 * développement est publique (dépôt) et permettrait de fabriquer une session. Sans
 * SESSION_SECRET (32 caractères au moins), les sessions sont refusées — l'accès reste fermé.
 */
export function sessionsConfigured(): boolean {
  const s = process.env.SESSION_SECRET;
  return Boolean(s && s.length >= 32) || !process.env.VERCEL;
}

export const sessionSecret = () => {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL) throw new Error("SESSION_SECRET manquant ou trop court (32 caractères au moins) : sessions désactivées.");
  return s ?? DEV_SECRET;
};

export function sign<T extends object>(payload: T, maxAgeSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify<T extends object>(token: string | undefined | null): (T & { exp: number }) | null {
  if (!token || !sessionsConfigured()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
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
