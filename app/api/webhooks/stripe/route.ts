/**
 * Webhook de Stripe : chaque événement de paiement (réussi, refusé, expiré, remboursé, contesté) est
 * vérifié par sa signature (STRIPE_WEBHOOK_SECRET, corps brut), puis appliqué à la commande dans la
 * base de la boutique (lib/paiement/suivi.ts). Un événement déjà traité n'est jamais refait.
 *
 * Réponses : 200 traité ou déjà traité ; 400 signature absente ou fausse (rien n'est lu) ;
 * 409 événement en cours sur un autre serveur ; 503 Stripe non configuré ; 500 erreur (Stripe
 * renvoie l'événement plus tard). Les erreurs et les signatures refusées sont consignées dans le
 * suivi des erreurs (relevé chaque semaine par le rôle Performance, et Sentry s'il est branché).
 */
import { NextResponse } from "next/server";
import { clientStripe, secretWebhook } from "@/lib/paiement/stripe";
import { verifierWebhook } from "@/lib/paiement/stripe-api";
import { traiterEvenement } from "@/lib/paiement/suivi";
import { EvenementEnCours } from "@/lib/paiement/rapprochement";
import { reportError } from "@/lib/errors/report";
import { kv } from "@/lib/store";

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
    // une ligne par heure au plus : des envois refusés en rafale ne chassent pas les vraies erreurs
    const refus = await kv.incr("stripe:signatures-refusees", 3600).catch(() => 0);
    if (refus === 1) await reportError({ source: "serveur", kind: "stripe-signature", message: "Webhook Stripe : signature absente ou refusée (une ligne par heure, quel que soit le nombre)", route: "/api/webhooks/stripe" }).catch(() => {});
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }
  try {
    const r = await traiterEvenement(event);
    return NextResponse.json({ received: true, suite: r });
  } catch (e) {
    if (e instanceof EvenementEnCours) return NextResponse.json({ error: "Événement en cours de traitement." }, { status: 409 });
    console.error(`[webhook stripe] ${event.type} ${event.id}`, e);
    await reportError({ source: "serveur", kind: "stripe-webhook", message: `Webhook Stripe ${event.type} ${event.id} : ${e instanceof Error ? e.message : String(e)}`, stack: e instanceof Error ? e.stack : undefined, route: "/api/webhooks/stripe" }).catch(() => {});
    return NextResponse.json({ error: "Événement non traité, à renvoyer." }, { status: 500 });
  }
}
