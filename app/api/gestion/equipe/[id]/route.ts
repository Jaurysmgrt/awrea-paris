import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { roleInfo, runRole } from "@/lib/agents/roles";

/** Lance un rôle à la main depuis l'Atelier › Équipe. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const { id } = await params;
  const info = roleInfo(id);
  if (!info) return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
  if (!info.run) return NextResponse.json({ error: `${info.name} est encore en préparation.` }, { status: 400 });
  const report = await runRole(info.id, "manuel");
  return NextResponse.json({ ok: true, message: report.resume, report });
}
