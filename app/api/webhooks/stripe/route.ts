/**
 * Webhook de Stripe : chaque événement de paiement (réussi, refusé, expiré, remboursé, contesté) est
 * vérifié par sa signature (STRIPE_WEBHOOK_SECRET, corps brut), puis appliqué à la commande dans la
 * base de la boutique (lib/paiement/suivi.ts). Un événement déjà traité n'est jamais refait.
 *
 * Réponses : 200 traité ou déjà traité ; 400 signature absente ou fausse (rien n'est lu) ;
 * 503 Stripe non configuré ; 500 erreur passagère (Stripe renvoie l'événement plus tard).
 */
import { NextResponse } from "next/server";
import { clientStripe, secretWebhook } from "@/lib/paiement/stripe";
import { verifierWebhook } from "@/lib/paiement/stripe-api";
import { traiterEvenement } from "@/lib/paiement/suivi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Corps d'un événement Stripe : quelques dizaines de kilo-octets au plus. */
const TAILLE_MAX = 512 * 1024;

export async function POST(req: Request) {
  const client = clientStripe();
  const secret = secretWebhook();
  if (!client || !secret) return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });
  if (Number(req.headers.get("content-length") ?? 0) > TAILLE_MAX) return NextResponse.json({ error: "Demande trop lourde." }, { status: 413 });
  const corps = await req.text();
  if (corps.length > TAILLE_MAX) return NextResponse.json({ error: "Demande trop lourde." }, { status: 413 });
  let event;
  try {
    event = verifierWebhook(client, corps, req.headers.get("stripe-signature"), secret);
  } catch {
    console.warn("[webhook stripe] signature refusée");
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }
  try {
    const r = await traiterEvenement(event);
    return NextResponse.json({ received: true, suite: r });
  } catch (e) {
    console.error(`[webhook stripe] ${event.type} ${event.id}`, e);
    return NextResponse.json({ error: "Événement non traité, à renvoyer." }, { status: 500 });
  }
}
