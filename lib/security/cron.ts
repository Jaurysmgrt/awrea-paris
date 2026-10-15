/**
 * Tâches planifiées (Vercel Cron) : Vercel envoie « Authorization: Bearer $CRON_SECRET ».
 * Sans CRON_SECRET, les tâches ne sont acceptées qu'en développement local.
 */
import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
