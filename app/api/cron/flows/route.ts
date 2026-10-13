/**
 * Scénarios d'e-mails planifiés (panier oublié, retour en stock, anniversaire de commande…),
 * une fois par jour : GET /api/cron/flows (Vercel Cron).
 */
import { NextResponse } from "next/server";
import { runDailyFlows } from "@/lib/marketing/flows";
import { isCronAuthorized } from "@/lib/security/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json({ ok: true, report: await runDailyFlows() });
}
