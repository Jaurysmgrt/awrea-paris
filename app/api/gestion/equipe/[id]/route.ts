import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { roleInfo, runRole } from "@/lib/agents/roles";
import { fluxDePassage, veutSuivre } from "@/lib/agents/progress";

export const maxDuration = 300;

/**
 * Lance un rôle à la main depuis l'Atelier › Équipe. Quand l'Atelier suit le passage
 * (Accept: application/x-ndjson), ses étapes arrivent au fil de l'eau, puis le compte rendu.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const { id } = await params;
  const info = roleInfo(id);
  if (!info) return NextResponse.json({ error: "Rôle inconnu." }, { status: 400 });
  if (!info.run) return NextResponse.json({ error: `${info.name} est encore en préparation.` }, { status: 400 });
  const ctx = { origin: new URL(req.url).origin };
  if (veutSuivre(req)) return fluxDePassage(`${info.name} se met au travail.`, async () => ({ report: await runRole(info.id, "manuel", new Date(), ctx) }));
  const report = await runRole(info.id, "manuel", new Date(), ctx);
  return NextResponse.json({ ok: true, message: report.resume, report });
}
