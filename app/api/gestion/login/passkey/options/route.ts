import { NextResponse } from "next/server";
import { ADMIN_LOGIN_GUARD as GUARD, setPasskeyChallenge } from "@/lib/auth/admin";
import { sessionsConfigured } from "@/lib/auth/session";
import { optionsConnexion } from "@/lib/auth/passkeys";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";

/** Connexion par Face ID ou l'empreinte, étape 1 : le défi que l'appareil va signer. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  if (!sessionsConfigured()) return NextResponse.json({ error: "La clé des sessions n’est pas configurée (SESSION_SECRET, 32 caractères au moins)." }, { status: 503 });
  const options = await optionsConnexion(req);
  await setPasskeyChallenge(options.challenge, "connexion");
  return NextResponse.json(options);
}
