/**
 * Tâches quotidiennes de la base clientes (Vercel Cron, GET /api/cron/flows) :
 *  - scénarios d'e-mails planifiés (panier oublié, avis, anniversaire, réactivation…) ;
 *  - purge des données arrivées à échéance (RGPD : durées annoncées dans la politique de confidentialité) ;
 *  - renouvellement hebdomadaire du jeton Instagram (60 jours de validité).
 */
import { NextResponse } from "next/server";
import { runDailyFlows } from "@/lib/marketing/flows";
import { purgeExpired } from "@/lib/customers";
import { isCronAuthorized } from "@/lib/security/cron";
import { refreshInstagramToken } from "@/lib/instagram/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const [report, purged, instagram] = await Promise.all([runDailyFlows(), purgeExpired().catch((e: Error) => ({ error: e.message })), refreshInstagramToken()]);
  return NextResponse.json({ ok: true, report, purged, instagram });
}
