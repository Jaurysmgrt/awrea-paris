/**
 * Suivi des erreurs : chaque erreur du serveur (instrumentation.ts) ou du navigateur (/api/erreurs)
 * est gardée dans le stockage technique (relevée chaque semaine par le rôle Performance) et, si
 * Sentry est branché (SENTRY_DSN), envoyée à Sentry par son API d'envoi, sans bibliothèque.
 * Jamais de cookie, d'en-tête, de corps de requête ni de paramètre d'adresse : seulement le
 * message, la pile d'appels raccourcie, le chemin sans sa requête et la route.
 */
import { kv } from "@/lib/store";
import { providerOf } from "@/lib/config/providers";

export const ERRORS_KEY = "erreurs";

export interface ErrorReport {
  date: string;
  source: "serveur" | "navigateur";
  message: string;
  stack?: string;
  digest?: string;
  path?: string;
  route?: string;
  kind?: string;
}

/** Chemin sans requête ni fragment (un jeton ne quitte jamais le site). */
const cleanPath = (p?: string) => (p ? p.split(/[?#]/)[0].slice(0, 200) : undefined);
const cut = (s: string | undefined, n: number) => (s ? s.slice(0, n) : undefined);
// adresses e-mail et longues suites (jetons) retirées des messages
const redact = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[e-mail]").replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[jeton]");

function parseDsn(dsn: string): { url: string; key: string } | null {
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\/+/, "");
    if (!u.username || !project) return null;
    return { url: `${u.protocol}//${u.host}/api/${project}/envelope/`, key: u.username };
  } catch {
    return null;
  }
}

async function toSentry(r: ErrorReport) {
  const dsn = process.env.SENTRY_DSN;
  const target = dsn ? parseDsn(dsn) : null;
  if (!target) return;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: r.date,
    platform: r.source === "serveur" ? "node" : "javascript",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tags: { source: r.source, route: r.route ?? "", kind: r.kind ?? "" },
    transaction: r.route ?? r.path,
    exception: { values: [{ type: "Error", value: r.message, stacktrace: r.stack ? { frames: r.stack.split("\n").slice(1, 20).reverse().map((l) => ({ function: l.trim().slice(0, 200) })) } : undefined }] },
    request: r.path ? { url: r.path } : undefined,
    extra: r.digest ? { digest: r.digest } : undefined,
  };
  const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;
  await fetch(target.url, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.key}, sentry_client=awrea/1.0` }, body, signal: AbortSignal.timeout(3000) }).catch(() => {});
}

export async function reportError(input: Omit<ErrorReport, "date">): Promise<void> {
  const r: ErrorReport = { ...input, date: new Date().toISOString(), message: redact(cut(input.message, 500) ?? ""), stack: input.stack ? redact(cut(input.stack, 2000)!) : undefined, path: cleanPath(input.path) };
  await kv.push(ERRORS_KEY, r, 300).catch(() => {});
  if (providerOf("errors") === "sentry") await toSentry(r);
}

export async function recentErrors(limit = 100): Promise<ErrorReport[]> {
  return kv.list<ErrorReport>(ERRORS_KEY, limit).catch(() => []);
}
