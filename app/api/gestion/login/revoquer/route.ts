import { NextResponse } from "next/server";
import { z } from "zod";
import { clearAdminCookie, revokeAdminSessions } from "@/lib/auth/admin";
import { estAutorisee, resetAccount } from "@/lib/auth/accounts";
import { kv } from "@/lib/store";
import { createHash } from "node:crypto";
import { verify } from "@/lib/auth/session";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";
import { logAction } from "@/lib/agents/log";
import { oublierTousLesAppareils } from "@/lib/admin/push";

/**
 * Lien « ce n'était pas moi » reçu après une connexion : ferme toutes les sessions de l'Atelier et
 * remet le compte à zéro (mot de passe personnel et double authentification à refaire). Il ne sert
 * qu'une fois, et plus du tout pour une adresse qui n'a plus accès à l'Atelier (personne retirée).
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "atelier-revoquer", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = z.object({ t: z.string().max(2000) }).safeParse(await req.json().catch(() => null));
  const token = parsed.success ? verify<{ purpose: string; email: string }>(parsed.data.t) : null;
  const invalide = () => NextResponse.json({ error: "Ce lien n’est plus valable. Fermez les sessions depuis les Réglages de l’Atelier, ou demandez de l’aide." }, { status: 400 });
  if (!token || token.purpose !== "revoquer" || !(await estAutorisee(token.email))) return invalide();
  const empreinte = createHash("sha256").update(parsed.success ? parsed.data.t : "").digest("hex");
  if (!(await kv.prendre(`atelier:revoquer-utilise:${empreinte}`, "1", 8 * 24 * 3600 * 1000))) return invalide();
  await revokeAdminSessions();
  await oublierTousLesAppareils();
  await resetAccount(token.email);
  await clearAdminCookie();
  await logSecurityEvent("admin_revoked", req, clientIp(req), token.email);
  await logAction({ agent: "systeme", kind: "sécurité", status: "failed", summary: `Sessions fermées et compte ${token.email} remis à zéro depuis le lien « ce n’était pas moi »` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
