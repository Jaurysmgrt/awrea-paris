/**
 * Client Stripe de la boutique, côté serveur uniquement : la clé secrète vient de la variable
 * d'environnement STRIPE_SECRET_KEY et ne quitte jamais le serveur ; le navigateur n'en reçoit
 * aucune (le paiement se fait sur la page hébergée par Stripe).
 */
import "server-only";
import { nouveauClient, type ClientStripe } from "@/lib/paiement/stripe-api";
import { paiementEnLigne, stripeConfigure } from "@/lib/config/boutique";

let client: ClientStripe | null = null;

/** Client Stripe, ou null si Stripe n'est pas configuré. */
export function clientStripe(): ClientStripe | null {
  if (!stripeConfigure()) return null;
  client ??= nouveauClient(process.env.STRIPE_SECRET_KEY!.trim());
  return client;
}

/** Client Stripe pour encaisser : seulement quand le paiement en ligne est ouvert. */
export function clientPourPayer(): ClientStripe | null {
  return paiementEnLigne() ? clientStripe() : null;
}

export const secretWebhook = () => process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
