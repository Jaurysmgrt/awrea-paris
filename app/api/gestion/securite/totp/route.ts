import { NextResponse } from "next/server";
import { clearAdminCookie, currentAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { resetAccountTotp } from "@/lib/auth/accounts";
import { logAction } from "@/lib/agents/log";

/**
 * Réinitialise la double authentification du compte connecté (téléphone perdu ou changé) : les
 * sessions sont fermées, et la prochaine connexion demande de scanner un nouveau QR code.
 */
export async function POST() {
  const email = await currentAdmin();
  if (!email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await resetAccountTotp(email);
  await revokeAdminSessions();
  await clearAdminCookie();
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Double authentification de ${email} réinitialisée : nouvel enrôlement à la prochaine connexion` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
