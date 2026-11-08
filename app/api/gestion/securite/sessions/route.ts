import { NextResponse } from "next/server";
import { clearAdminCookie, isAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { oublierTousLesAppareils } from "@/lib/admin/push";

/**
 * Déconnecte l'Atelier sur tous les appareils (session oubliée sur un ordinateur, doute, téléphone
 * perdu) et coupe les notifications de l'application sur chacun d'eux.
 */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await revokeAdminSessions();
  // un téléphone perdu ne reçoit plus aucune notification
  await oublierTousLesAppareils();
  await clearAdminCookie();
  await logAction({ agent: "rapport", kind: "sécurité", status: "done", summary: "Toutes les sessions de l’Atelier ont été fermées" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
