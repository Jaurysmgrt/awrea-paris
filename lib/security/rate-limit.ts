/**
 * Limitation de débit partagée entre les instances (Upstash Redis en production,
 * mémoire en local) : formulaires, connexions, assistante, preuves de consentement.
 * Fenêtres fixes ; l'identifiant est l'adresse IP (jamais conservée au-delà de la fenêtre).
 */
import { NextResponse } from "next/server";
import { kv } from "@/lib/store";

export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export interface LimitOptions {
  limit: number;
  windowSeconds: number;
}

export async function hit(bucket: string, id: string, { limit, windowSeconds }: LimitOptions) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:${bucket}:${id}:${window}`;
  let count = 0;
  try {
    count = await kv.incr(key, windowSeconds);
  } catch {
    return { allowed: true, count: 0, retryAfter: 0 }; // stockage indisponible : on ne bloque pas
  }
  const retryAfter = (window + 1) * windowSeconds - Math.floor(Date.now() / 1000);
  return { allowed: count <= limit, count, retryAfter };
}

/** Compte la requête ; renvoie une réponse 429 si la limite est dépassée, sinon null. */
export async function rateLimit(req: Request, bucket: string, opts: LimitOptions, message = "Trop de demandes en peu de temps. Merci de réessayer dans quelques minutes.") {
  const r = await hit(bucket, clientIp(req), opts);
  if (r.allowed) return null;
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
}

/**
 * Tentatives de connexion : seuls les échecs comptent ; au-delà de `limit` échecs dans la fenêtre,
 * la connexion est bloquée pour cet identifiant (adresse IP) jusqu'à la fin de la fenêtre.
 */
export const loginGuard = {
  key(bucket: string, id: string, windowSeconds: number) {
    return `rl:fail:${bucket}:${id}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  },
  async blocked(bucket: string, id: string, opts: LimitOptions) {
    return (await kv.peek(this.key(bucket, id, opts.windowSeconds)).catch(() => 0)) >= opts.limit;
  },
  async fail(bucket: string, id: string, opts: LimitOptions) {
    return kv.incr(this.key(bucket, id, opts.windowSeconds), opts.windowSeconds).catch(() => 0);
  },
  async reset(bucket: string, id: string, opts: LimitOptions) {
    await kv.del(this.key(bucket, id, opts.windowSeconds)).catch(() => {});
  },
};
