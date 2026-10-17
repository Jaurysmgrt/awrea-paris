import { NextResponse } from "next/server";
import { z } from "zod";
import { clearAdminCookie, revokeAdminSessions } from "@/lib/auth/admin";
import { resetAccount } from "@/lib/auth/accounts";
import { verify } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";
import { logAction } from "@/lib/agents/log";

/**
 * Lien « ce n'était pas moi » reçu après une connexion : ferme toutes les sessions de l'Atelier et
 * remet le compte à zéro (mot de passe personnel et double authentification à refaire).
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "atelier-revoquer", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = z.object({ t: z.string().max(2000) }).safeParse(await req.json().catch(() => null));
  const token = parsed.success ? verify<{ purpose: string; email: string }>(parsed.data.t) : null;
  if (!token || token.purpose !== "revoquer") return NextResponse.json({ error: "Ce lien n’est plus valable. Fermez les sessions depuis les Réglages de l’Atelier, ou demandez de l’aide." }, { status: 400 });
  await revokeAdminSessions();
  await resetAccount(token.email);
  await clearAdminCookie();
  await logSecurityEvent("admin_revoked", req, clientIp(req), token.email);
  await logAction({ agent: "systeme", kind: "sécurité", status: "failed", summary: `Sessions fermées et compte ${token.email} remis à zéro depuis le lien « ce n’était pas moi »` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
