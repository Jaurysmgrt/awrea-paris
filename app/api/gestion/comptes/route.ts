import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey, estAutorisee, proprietaire, resetAccount } from "@/lib/auth/accounts";
import { personneAjoutee } from "@/lib/auth/personnes";
import { loginGuard } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";

/**
 * Comptes autorisés (Réglages) : débloquer une adresse (toute personne de l'Atelier), ou remettre un
 * compte de Vercel à zéro (mot de passe et double authentification à refaire avec le mot de passe
 * d'installation : la propriétaire seule). Une personne ajoutée depuis l'Atelier se remet à zéro par
 * un nouveau code d'invitation (app/api/gestion/personnes).
 */
export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["debloquer", "remettre-a-zero"]), email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await estAutorisee(parsed.data.email))) return NextResponse.json({ error: "Compte inconnu." }, { status: 400 });
  const { action, email } = parsed.data;
  if (action === "debloquer") {
    await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} débloqué par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (me !== proprietaire()) return NextResponse.json({ error: "Seule la propriétaire de l’Atelier peut remettre un compte à zéro." }, { status: 403 });
  if (await personneAjoutee(email)) return NextResponse.json({ error: "Pour une personne ajoutée, donnez-lui un nouveau code d’invitation." }, { status: 400 });
  await resetAccount(email);
  await revokeAdminSessions();
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} remis à zéro par ${me} ; toutes les sessions sont fermées` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
