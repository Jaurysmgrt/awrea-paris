/**
 * Cloudflare Turnstile : protection anti-robots des formulaires (contact, newsletter, liste
 * d'attente, connexion, avis…), sans casse-tête visuel. Considéré comme strictement nécessaire
 * (sécurité) : aucun consentement requis. Sans clés (ou avec CAPTCHA_PROVIDER=mock), la
 * vérification est ignorée (démonstration).
 */
import "server-only";
import { clientIp } from "./rate-limit";
import { providerOf } from "@/lib/config/providers";

export const turnstileEnabled = providerOf("captcha") === "turnstile";

export async function verifyTurnstile(token: string | undefined | null, req: Request): Promise<boolean> {
  if (!turnstileEnabled) return true;
  const secret = process.env.TURNSTILE_SECRET_KEY!;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
      cache: "no-store",
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
