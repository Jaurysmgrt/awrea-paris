import { NextResponse } from "next/server";
import { clearAdminCookie, isAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";

/** Déconnecte l'Atelier sur tous les appareils (session oubliée sur un ordinateur, doute). */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  await revokeAdminSessions();
  await clearAdminCookie();
  await logAction({ agent: "rapport", kind: "sécurité", status: "done", summary: "Toutes les sessions de l’Atelier ont été fermées" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
