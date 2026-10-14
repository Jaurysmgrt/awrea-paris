/**
 * Journal de sécurité : connexions à l'Atelier (réussies, refusées, bloquées), connexions
 * inhabituelles, requêtes refusées (origine étrangère, débit dépassé). Il alimente le tableau de
 * bord (Réglages → Sécurité) et le contrôle quotidien de l'agent de maintenance.
 *
 * Chaque connexion réussie envoie un e-mail à la titulaire du compte (copie à SECURITY_ALERT_EMAIL),
 * avec un lien « ce n'était pas moi » qui ferme toutes les sessions. Une connexion depuis un
 * appareil (navigateur et système) ou un réseau (adresse IP tronquée) jamais vu depuis 90 jours est
 * signalée comme inhabituelle. Un compte bloqué après plusieurs échecs prévient aussi sa titulaire.
 * Les adresses IP sont conservées tronquées (RGPD : minimisation).
 */
import "server-only";
import { createHash } from "node:crypto";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { brandEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { sign } from "@/lib/auth/session";
import { sessionGeneration } from "@/lib/auth/admin";
import { atelierHref } from "@/lib/admin/path";
import { absolute } from "@/lib/seo/metadata";

export type SecurityEventType =
  | "admin_password_ok"
  | "admin_password_fail"
  | "admin_code_fail"
  | "admin_login_ok"
  | "admin_login_blocked"
  | "admin_login_unusual"
  | "admin_enrolled"
  | "admin_password_set"
  | "admin_account_locked"
  | "admin_revoked";

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
 * et le réseau, et écrit à la titulaire du compte, en signalant une connexion inhabituelle.
 */
export async function recordAdminLogin(req: Request, ip: string, email: string): Promise<{ unusual: boolean }> {
  const ev = await logSecurityEvent("admin_login_ok", req, ip, email);
  const known = (await kv.get<Known>(KNOWN_KEY)) ?? {};
  const now = Date.now();
  for (const [k, at] of Object.entries(known)) if (now - Date.parse(at) > KNOWN_DAYS * 86_400_000) delete known[k];
  const d = fingerprint("device", `${email}|${ev.device}`);
  const n = fingerprint("network", `${email}|${ev.network}`);
  const firstEver = !Object.keys(known).some((k) => k.startsWith("device:"));
  const unusual = !firstEver && (!known[d] || !known[n]);
  if (unusual) await logSecurityEvent("admin_login_unusual", req, ip, `${email} : ${!known[d] ? "appareil inconnu" : "réseau inconnu"}`);
  known[d] = ev.at;
  known[n] = ev.at;
  await kv.set(KNOWN_KEY, known);
  await loginEmail(email, ev, unusual, req).catch((e) => console.error("[sécurité] alerte de connexion non envoyée", e));
  return { unusual };
}

/** Lien « ce n'était pas moi » : ferme toutes les sessions et remet le compte à zéro (7 jours). */
export async function revokeLink(email: string): Promise<string> {
  const t = sign({ purpose: "revoquer", email, g: await sessionGeneration() }, 7 * 24 * 3600);
  return absolute(`${atelierHref("/revoquer")}?t=${encodeURIComponent(t)}`);
}

const recipients = (email: string) => [...new Set([email, process.env.SECURITY_ALERT_EMAIL].filter(Boolean) as string[])];
const when = (at: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(at));

function place(req: Request): string {
  const city = req.headers.get("x-vercel-ip-city");
  const country = req.headers.get("x-vercel-ip-country");
  if (!city && !country) return "";
  return `, vers ${[city ? decodeURIComponent(city) : "", country ?? ""].filter(Boolean).join(", ")}`;
}

async function loginEmail(email: string, ev: SecurityEvent, unusual: boolean, req: Request) {
  const link = await revokeLink(email);
  const { html, text } = brandEmail({
    preheader: unusual ? "Une connexion à l’Atelier vient d’avoir lieu depuis un appareil ou un réseau que nous ne connaissions pas." : "Une connexion à l’Atelier vient d’avoir lieu avec votre compte.",
    title: unusual ? "Connexion inhabituelle à l’Atelier" : "Connexion à l’Atelier",
    paragraphs: [
      `Votre compte ${email} vient d’entrer dans l’Atelier le ${when(ev.at)}, depuis ${ev.device} (réseau ${ev.network}${place(req)}).`,
      unusual ? "Cet appareil ou ce réseau n’avait jamais servi à entrer depuis trois mois." : "Si c’est bien vous, il n’y a rien à faire.",
      "Si ce n’est pas vous, ouvrez le lien ci-dessous. Toutes les sessions seront fermées et votre compte devra être recréé avec le mot de passe d’installation. Changez ensuite ce mot de passe dans Vercel (ATELIER_PASSWORD).",
    ],
    cta: { label: "Ce n’était pas moi", href: link },
    signature: "La sécurité du site Awrea Paris",
  });
  await sendEmail({ to: recipients(email).join(","), subject: unusual ? "Connexion inhabituelle à l’Atelier" : "Connexion à l’Atelier", html, text, tag: "securite" });
}

/** Compte bloqué après plusieurs échecs : la titulaire est prévenue. */
export async function alertLocked(email: string, req: Request, ip: string) {
  const ev = await logSecurityEvent("admin_account_locked", req, ip, email);
  const { html, text } = brandEmail({
    preheader: "Plusieurs tentatives de connexion ont échoué sur votre compte de l’Atelier.",
    title: "Compte de l’Atelier bloqué pour une demi-heure",
    paragraphs: [
      `Plusieurs tentatives de connexion à votre compte ${email} ont échoué le ${when(ev.at)}, depuis ${ev.device} (réseau ${ev.network}${place(req)}).`,
      "Le compte reste bloqué une demi-heure. Si ce n’est pas vous, gardez votre mot de passe secret et prévenez la personne qui gère le site : le réseau pourra être bloqué dans le pare-feu.",
    ],
    signature: "La sécurité du site Awrea Paris",
  });
  await sendEmail({ to: recipients(email).join(","), subject: "Compte de l’Atelier bloqué", html, text, tag: "securite" }).catch((e) => console.error("[sécurité] alerte de blocage non envoyée", e));
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
    lockedAccounts: count("admin_account_locked"),
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
