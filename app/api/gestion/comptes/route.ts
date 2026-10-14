import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey, isAllowed, resetAccount } from "@/lib/auth/accounts";
import { loginGuard } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";

/**
 * Comptes autorisés (Réglages) : débloquer une adresse, ou remettre un compte à zéro (mot de passe
 * et double authentification à refaire avec le mot de passe d'installation). La liste des adresses
 * autorisées se règle dans ATELIER_ACCOUNTS, jamais depuis le site.
 */
export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["debloquer", "remettre-a-zero"]), email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isAllowed(parsed.data.email)) return NextResponse.json({ error: "Compte inconnu." }, { status: 400 });
  const { action, email } = parsed.data;
  if (action === "debloquer") {
    await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} débloqué par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  await resetAccount(email);
  await revokeAdminSessions();
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} remis à zéro par ${me} ; toutes les sessions sont fermées` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
