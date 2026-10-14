import { NextResponse } from "next/server";
import { clearAdminCookie, isAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { resetEnrollment } from "@/lib/auth/totp";
import { logAction } from "@/lib/agents/log";

/**
 * Réinitialise la double authentification (téléphone perdu ou changé) : la session est fermée,
 * et la prochaine connexion demande de scanner un nouveau QR code après le mot de passe.
 */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await resetEnrollment();
  await revokeAdminSessions();
  await clearAdminCookie();
  await logAction({ agent: "rapport", kind: "sécurité", status: "done", summary: "Double authentification réinitialisée : nouvel enrôlement à la prochaine connexion" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
