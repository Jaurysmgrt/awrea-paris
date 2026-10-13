/**
 * Journal de sécurité : connexions à l'Atelier (réussies, refusées, bloquées), connexions
 * inhabituelles, requêtes refusées (origine étrangère, débit dépassé). Il alimente le tableau de
 * bord (Réglages → Sécurité) et le contrôle quotidien de l'agent de maintenance.
 *
 * Connexion inhabituelle : un appareil (navigateur + système) ou un réseau (adresse IP tronquée)
 * jamais vu lors d'une connexion réussie des 90 derniers jours. La créatrice reçoit alors un
 * e-mail d'alerte. Les adresses IP sont conservées tronquées (RGPD : minimisation).
 */
import "server-only";
import { createHash } from "node:crypto";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { brandEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

export type SecurityEventType =
  | "admin_password_ok"
  | "admin_password_fail"
  | "admin_code_fail"
  | "admin_login_ok"
  | "admin_login_blocked"
  | "admin_login_unusual"
  | "admin_enrolled";

export interface SecurityEvent {
  at: string;
  type: SecurityEventType;
  /** réseau tronqué (IPv4 /24, IPv6 /48) */
  network: string;
  device: string;
  detail?: string;
}

const EVENTS_KEY = "security:events";
const KNOWN_KEY = "security:admin-known";
const KNOWN_DAYS = 90;

/** IP tronquée : assez pour reconnaître un réseau, pas pour identifier une personne. */
export function network(ip: string): string {
  if (ip.includes(":")) return `${ip.split(":").slice(0, 3).join(":")}::/48`;
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts.slice(0, 3).join(".")}.0/24` : "inconnu";
}

/** Famille d'appareil lisible (navigateur + système), sans numéro de version. */
export function device(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur inconnu";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "système inconnu";
  return `${browser} · ${os}`;
}

export async function logSecurityEvent(type: SecurityEventType, req: Request, ip: string, detail?: string): Promise<SecurityEvent> {
  const event: SecurityEvent = { at: new Date().toISOString(), type, network: network(ip), device: device(req.headers.get("user-agent")), detail };
  await kv.push(EVENTS_KEY, event, 2000).catch(() => {});
  return event;
}

export async function securityEvents(limit = 200): Promise<SecurityEvent[]> {
  return kv.list<SecurityEvent>(EVENTS_KEY, limit);
}

type Known = Record<string, string>; // empreinte → dernière connexion réussie

const fingerprint = (kind: "device" | "network", value: string) => `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;

/**
 * À appeler après une connexion réussie (double authentification validée) : enregistre l'appareil
 * et le réseau, et alerte la créatrice si l'un des deux est nouveau.
 */
export async function recordAdminLogin(req: Request, ip: string): Promise<{ unusual: boolean }> {
  const ev = await logSecurityEvent("admin_login_ok", req, ip);
  const known = (await kv.get<Known>(KNOWN_KEY)) ?? {};
  const now = Date.now();
  for (const [k, at] of Object.entries(known)) if (now - Date.parse(at) > KNOWN_DAYS * 86_400_000) delete known[k];
  const firstEver = Object.keys(known).length === 0;
  const d = fingerprint("device", ev.device);
  const n = fingerprint("network", ev.network);
  const unusual = !firstEver && (!known[d] || !known[n]);
  known[d] = ev.at;
  known[n] = ev.at;
  await kv.set(KNOWN_KEY, known);
  if (unusual) {
    await logSecurityEvent("admin_login_unusual", req, ip, !known[d] ? "appareil inconnu" : "réseau inconnu");
    await alertCreator(ev).catch((e) => console.error("[sécurité] alerte non envoyée", e));
  }
  return { unusual };
}

async function alertCreator(ev: SecurityEvent) {
  const to = process.env.SECURITY_ALERT_EMAIL ?? identity.email;
  const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(ev.at));
  const { html, text } = brandEmail({
    preheader: "Une connexion à l’Atelier vient d’avoir lieu depuis un appareil ou un réseau inhabituel.",
    title: "Connexion inhabituelle à l’Atelier",
    paragraphs: [
      `Une connexion au tableau de bord a réussi le ${when}, depuis ${ev.device} (réseau ${ev.network}).`,
      "Si c’est bien vous, il n’y a rien à faire. Sinon, changez immédiatement le mot de passe de l’Atelier (ATELIER_PASSWORD), réinitialisez la double authentification depuis Réglages, puis consultez le journal de sécurité.",
    ],
    signature: "La sécurité du site Awrea Paris",
  });
  await sendEmail({ to, subject: "Connexion inhabituelle à l’Atelier", html, text, tag: "securite" });
}

/** Requêtes refusées (compteurs du jour et de la veille, voir countRefusal). */
async function dailyCount(kind: "csrf" | "rate", hours: number): Promise<number> {
  const days = Math.max(1, Math.ceil(hours / 24));
  let total = 0;
  for (let i = 0; i <= days; i++) total += await kv.peek(`security:count:${kind}:${new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)}`).catch(() => 0);
  return total;
}

/** Résumé des dernières 24 heures, pour le contrôle quotidien de l'agent de maintenance. */
export async function securityDigest(hours = 24) {
  const since = Date.now() - hours * 3_600_000;
  const recent = (await securityEvents(2000)).filter((e) => Date.parse(e.at) >= since);
  const count = (t: SecurityEventType) => recent.filter((e) => e.type === t).length;
  return {
    since: new Date(since).toISOString(),
    adminLogins: count("admin_login_ok"),
    adminFailures: count("admin_password_fail") + count("admin_code_fail"),
    adminBlocked: count("admin_login_blocked"),
    unusualLogins: count("admin_login_unusual"),
    csrfBlocked: await dailyCount("csrf", hours),
    rateLimited: await dailyCount("rate", hours),
    /** réseaux à l'origine de plus de 20 échecs : à bloquer dans le pare-feu Vercel */
    suspiciousNetworks: Object.entries(
      recent.filter((e) => ["admin_password_fail", "admin_code_fail", "admin_login_blocked"].includes(e.type)).reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.network]: (acc[e.network] ?? 0) + 1 }), {}),
    )
      .filter(([, n]) => n > 20)
      .map(([network, failures]) => ({ network, failures })),
  };
}
