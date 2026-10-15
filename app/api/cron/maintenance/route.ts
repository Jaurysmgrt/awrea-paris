/**
 * Dépôt du rapport quotidien de l'agent de maintenance (POST, avec CRON_SECRET), affiché dans
 * le tableau de bord Atelier.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isCronAuthorized } from "@/lib/security/cron";
import { saveMaintenanceReport } from "@/lib/maintenance";
import { logAction } from "@/lib/agents/log";

export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["ok", "corrige", "alerte", "annule"]),
  summary: z.string().min(1).max(500),
  details: z.array(z.string().max(500)).max(40).default([]),
  link: z.url().max(300).optional(),
});

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Rapport illisible." }, { status: 400 });
  const report = { date: new Date().toISOString(), ...parsed.data };
  await saveMaintenanceReport(report);
  await logAction({ agent: "systeme", kind: "maintenance", status: report.status === "alerte" || report.status === "annule" ? "failed" : "done", summary: `Maintenance quotidienne · ${report.summary}`, detail: report.details.join("\n") || undefined }).catch(() => {});
  return NextResponse.json({ ok: true });
}
