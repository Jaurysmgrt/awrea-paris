/**
 * Point d'entrée Vercel Cron : GET /api/cron/<agent>
 * Vercel envoie « Authorization: Bearer $CRON_SECRET » quand la variable CRON_SECRET est définie.
 */
import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/registry";
import { siteUrl } from "@/lib/seo/metadata";
import { isCronAuthorized } from "@/lib/security/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request, { params }: { params: Promise<{ agent: string }> }) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { agent } = await params;
  const origin = process.env.VERCEL ? siteUrl : new URL(req.url).origin;
  try {
    const run = await runAgent(agent, { origin, trigger: "cron" });
    return NextResponse.json({ ok: true, run });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
