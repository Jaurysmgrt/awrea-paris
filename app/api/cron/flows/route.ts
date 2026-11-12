/**
 * Tâches quotidiennes de la base clientes (Vercel Cron, GET /api/cron/flows) :
 *  - scénarios d'e-mails planifiés (avant-premières, panier en attente, après la livraison, avis) ;
 *  - parcours de vente (lib/marketing/parcours), après les scénarios pour que le plafond de
 *    fréquence compte les e-mails partis le matin même ; en simulation tant que la Maison ne les a
 *    pas validés ;
 *  - purge des données arrivées à échéance (RGPD : durées annoncées dans la politique de confidentialité) ;
 *  - renouvellement hebdomadaire du jeton Instagram (60 jours de validité).
 */
import { NextResponse } from "next/server";
import { runDailyFlows } from "@/lib/marketing/flows";
import { runParcours } from "@/lib/marketing/parcours";
import { purgeExpired } from "@/lib/customers";
import { isCronAuthorized } from "@/lib/security/cron";
import { refreshInstagramToken } from "@/lib/instagram/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const [report, purged, instagram] = await Promise.all([runDailyFlows(), purgeExpired().catch((e: Error) => ({ error: e.message })), refreshInstagramToken()]);
  const parcours = await runParcours().catch((e: Error) => ({ error: e.message }));
  return NextResponse.json({ ok: true, report, parcours, purged, instagram });
}
