import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey, estAutorisee } from "@/lib/auth/accounts";
import { loginGuard } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";

/**
 * Comptes autorisés (Réglages) : débloquer une adresse après plusieurs essais manqués à la connexion.
 * La remise à zéro d'un compte, l'ajout et le retrait d'un accès passent par
 * app/api/gestion/personnes, qui redemande le code à six chiffres (relecture de sécurité du 09/11).
 * Débloquer ne touche pas au compteur des essais de code de ces gestes.
 */
export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ action: z.literal("debloquer"), email: z.string().trim().toLowerCase().email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await estAutorisee(parsed.data.email))) return NextResponse.json({ error: "Compte inconnu." }, { status: 400 });
  const { email } = parsed.data;
  await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} débloqué par ${me}` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
