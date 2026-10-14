/**
 * Contrôle de sécurité interne, lu chaque jour par l'agent de maintenance (GitHub Actions) :
 * connexions et tentatives refusées des dernières 24 heures, réglages sensibles, et les règles de
 * l'accès à l'Atelier (adresse secrète, comptes autorisés, double authentification de chacun,
 * routes internes fermées, robots.txt). Aucune donnée personnelle : réseaux tronqués seulement.
 */
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/security/cron";
import { securityDigest } from "@/lib/security/audit";
import { usingDemoPassword } from "@/lib/auth/admin";
import { allowedEmails, hasTotp, listAccounts, recoveryLeft } from "@/lib/auth/accounts";
import { atelierBase, atelierPathIsSecret, ATELIER_PREFIX } from "@/lib/admin/path";
import { cspMode } from "@/lib/security/headers";
import { turnstileEnabled } from "@/lib/security/turnstile";
import { siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

async function fetchStatus(url: string): Promise<{ status: number; body: string; robots: string | null }> {
  try {
    const res = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8000) });
    return { status: res.status, body: res.status === 200 ? await res.text() : "", robots: res.headers.get("x-robots-tag") };
  } catch {
    return { status: 0, body: "", robots: null };
  }
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const origin = new URL(req.url).origin;
  const base = atelierBase();
  const [digest, accounts] = await Promise.all([securityDigest(24), listAccounts()]);
  const warnings: string[] = [];
  if (usingDemoPassword()) warnings.push("ATELIER_PASSWORD (mot de passe d'installation) n'est pas défini.");
  if (!process.env.SESSION_SECRET) warnings.push("SESSION_SECRET n'est pas défini.");
  if (!process.env.CRON_SECRET) warnings.push("CRON_SECRET n'est pas défini.");
  if (!process.env.ATELIER_ACCOUNTS) warnings.push(`ATELIER_ACCOUNTS n'est pas défini : seul ${allowedEmails().join(", ")} peut entrer.`);

  // accès à l'Atelier
  if (!base) warnings.push("L'Atelier est fermé : ADMIN_PATH manque ou n'a pas la forme « /prive-<12 lettres ou chiffres au moins> ».");
  else if (!atelierPathIsSecret() && process.env.VERCEL_ENV === "production") warnings.push("L'adresse de l'Atelier n'est pas secrète (ADMIN_PATH).");
  for (const a of accounts) {
    if (!a.passwordHash) warnings.push(`Le compte ${a.email} n'a pas encore choisi son mot de passe.`);
    else if (!hasTotp(a)) warnings.push(`Le compte ${a.email} n'a pas encore configuré sa double authentification.`);
    else if (recoveryLeft(a) < 3) warnings.push(`Le compte ${a.email} n'a plus que ${recoveryLeft(a)} code(s) de secours.`);
  }
  const [internalPage, internalApi, robots, home] = await Promise.all([fetchStatus(`${origin}/gestion`), fetchStatus(`${origin}/api/gestion/agents`), fetchStatus(`${origin}/robots.txt`), fetchStatus(`${origin}/`)]);
  if (base !== "/gestion" && internalPage.status !== 404) warnings.push(`/gestion répond ${internalPage.status} au lieu de 404.`);
  if (internalApi.status !== 404) warnings.push(`/api/gestion répond ${internalApi.status} au lieu de 404.`);
  if (!robots.body.includes(`Disallow: ${ATELIER_PREFIX}`)) warnings.push(`robots.txt n'écarte pas ${ATELIER_PREFIX}.`);
  if (base && base !== "/gestion" && (robots.body.includes(base) || home.body.includes(base))) warnings.push("L'adresse secrète de l'Atelier apparaît sur une page publique.");
  if (base) {
    const login = await fetchStatus(`${origin}${base}/connexion`);
    if (!login.robots?.includes("noindex")) warnings.push("La page de connexion de l'Atelier n'envoie pas « noindex ».");
  }

  if (!turnstileEnabled) warnings.push("La protection anti-robots est en simulation (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, CAPTCHA_PROVIDER).");
  if (digest.unusualLogins) warnings.push(`${digest.unusualLogins} connexion(s) inhabituelle(s) à l'Atelier.`);
  if (digest.lockedAccounts) warnings.push(`${digest.lockedAccounts} blocage(s) de compte après plusieurs échecs.`);
  if (digest.suspiciousNetworks.length) warnings.push(`Réseaux suspects à bloquer dans le pare-feu : ${digest.suspiciousNetworks.map((n) => n.network).join(", ")}.`);
  return NextResponse.json({ ok: warnings.length === 0, site: siteUrl, cspMode, digest, comptes: accounts.length, warnings });
}
