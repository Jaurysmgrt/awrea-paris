/**
 * Contrôle de sécurité interne, lu chaque jour par l'agent de maintenance (GitHub Actions) :
 * connexions et tentatives refusées des dernières 24 heures, réglages sensibles.
 * Aucune donnée personnelle : réseaux tronqués et familles d'appareils seulement.
 */
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/security/cron";
import { securityDigest } from "@/lib/security/audit";
import { isEnrolled, recoveryCodesLeft } from "@/lib/auth/totp";
import { usingDemoPassword } from "@/lib/auth/admin";
import { cspMode } from "@/lib/security/headers";
import { turnstileEnabled } from "@/lib/security/turnstile";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const [digest, enrolled, codesLeft] = await Promise.all([securityDigest(24), isEnrolled(), recoveryCodesLeft()]);
  const warnings: string[] = [];
  if (usingDemoPassword()) warnings.push("ATELIER_PASSWORD n'est pas défini.");
  if (!process.env.SESSION_SECRET) warnings.push("SESSION_SECRET n'est pas défini.");
  if (!process.env.CRON_SECRET) warnings.push("CRON_SECRET n'est pas défini.");
  if (!enrolled) warnings.push("La double authentification de l'Atelier n'est pas encore configurée.");
  if (enrolled && codesLeft < 3) warnings.push(`Plus que ${codesLeft} code(s) de secours : en générer de nouveaux (réinitialiser la double authentification).`);
  if (!turnstileEnabled) warnings.push("La protection anti-robots est en simulation (TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY, CAPTCHA_PROVIDER).");
  if (digest.unusualLogins) warnings.push(`${digest.unusualLogins} connexion(s) inhabituelle(s) à l'Atelier.`);
  if (digest.suspiciousNetworks.length) warnings.push(`Réseaux suspects à bloquer dans le pare-feu : ${digest.suspiciousNetworks.map((n) => n.network).join(", ")}.`);
  return NextResponse.json({ ok: warnings.length === 0, cspMode, digest, warnings });
}
