/** Compte rendu de la sauvegarde chiffrée de la nuit (POST depuis GitHub Actions, avec CRON_SECRET). */
import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { isCronAuthorized } from "@/lib/security/cron";
import { BACKUP_KEY } from "@/lib/agents/roles/sauvegarde";
import { logAction } from "@/lib/agents/log";

export const dynamic = "force-dynamic";

const Body = z.object({ ok: z.boolean(), restauration: z.boolean(), horsSite: z.boolean().default(false), details: z.string().max(500).optional(), lien: z.url().max(300).optional() });

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Compte rendu illisible." }, { status: 400 });
  const report = { date: new Date().toISOString(), ...parsed.data };
  await kv.set(BACKUP_KEY, report);
  await logAction({ agent: "sauvegarde", kind: "sauvegarde", status: report.ok && report.restauration ? "done" : "failed", summary: report.ok && report.restauration ? "Sauvegarde de la nuit faite et relue" : "Sauvegarde de la nuit en échec" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
