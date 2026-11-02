import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { ADMIN_LOGIN_GUARD as GUARD, setAdminCookie, takePasskeyChallenge } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey } from "@/lib/auth/accounts";
import { compteDeLaCle, terminerConnexion } from "@/lib/auth/passkeys";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { alertLocked, logSecurityEvent, recordAdminLogin } from "@/lib/security/audit";
import { logAction } from "@/lib/agents/log";

const b64url = z.string().max(16_384).regex(/^[A-Za-z0-9_-]*$/);
const Body = z.object({
  id: b64url.max(1024),
  rawId: b64url.max(1024),
  type: z.literal("public-key"),
  response: z.object({ clientDataJSON: b64url, authenticatorData: b64url, signature: b64url, userHandle: b64url.max(1024).optional() }),
  clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

/**
 * Connexion par Face ID ou l'empreinte, étape 2 : la réponse signée de l'appareil. Mêmes garde-fous
 * que le mot de passe : limite par réseau, blocage du compte après cinq échecs, alerte par e-mail à
 * chaque connexion, journal de sécurité.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  const challenge = await takePasskeyChallenge("connexion");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!challenge) return NextResponse.json({ error: "Le délai est passé : touchez de nouveau « Entrer avec Face ID »." }, { status: 401 });
  const trouve = parsed.success ? await compteDeLaCle(parsed.data.id) : null;
  const key = trouve ? emailKey(trouve.account.email) : null;
  if (key && (await loginGuard.blocked("admin-compte", key, ACCOUNT_GUARD))) {
    return NextResponse.json({ error: "Ce compte est bloqué pour une demi-heure après plusieurs essais. Un e-mail a été envoyé à son adresse." }, { status: 429 });
  }
  const email = parsed.success ? await terminerConnexion(parsed.data as AuthenticationResponseJSON, challenge, req) : null;
  if (!email) {
    await loginGuard.fail("admin", ip, GUARD);
    if (key && trouve) {
      const fails = await loginGuard.fail("admin-compte", key, ACCOUNT_GUARD);
      if (fails === ACCOUNT_GUARD.limit) await alertLocked(trouve.account.email, req, ip);
    }
    await logSecurityEvent("admin_passkey_fail", req, ip, trouve?.account.email);
    return NextResponse.json({ error: "Cette clé n’ouvre pas l’Atelier. Entrez avec votre adresse et votre mot de passe." }, { status: 401 });
  }
  await loginGuard.reset("admin", ip, GUARD);
  await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
  await setAdminCookie(email);
  const { unusual } = await recordAdminLogin(req, ip, email);
  await logAction({
    agent: "systeme",
    kind: "sécurité",
    status: "info",
    summary: unusual ? `Connexion inhabituelle de ${email} à l’Atelier (Face ID), alerte envoyée` : `Connexion de ${email} à l’Atelier (Face ID)`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
