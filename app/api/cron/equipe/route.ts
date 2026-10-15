/** Passage du matin des rôles de gestion quotidienne (lib/agents/roles). */
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/security/cron";
import { runDueRoles } from "@/lib/agents/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const reports = await runDueRoles();
  return NextResponse.json({ ok: true, roles: reports.map((r) => ({ role: r.role, resume: r.resume, controle: r.controle.length })) });
}
