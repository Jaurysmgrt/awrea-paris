/**
 * Appels à l'API officielle de Stripe (SDK `stripe`), côté serveur uniquement : la clé secrète vit
 * dans les variables d'environnement (STRIPE_SECRET_KEY), jamais dans le code ni dans le navigateur.
 * Les fonctions prennent le client en paramètre : les tests le dirigent vers un faux serveur local.
 *
 * Chaque opération qui engage de l'argent porte une clé d'idempotence (lib/paiement/session.ts) :
 * deux demandes identiques (double clic, nouvel essai après une coupure) ne font qu'une opération.
 */
import Stripe from "stripe";
import { cleIdempotence } from "@/lib/paiement/session";
import type { Order } from "@/lib/commerce/types";

export type ClientStripe = Stripe;

/** Clé secrète de test (sk_test_, rk_test_) ou réelle (sk_live_, rk_live_). */
export const cleDeTest = (cle: string) => /^(sk|rk)_test_/.test(cle);
export const cleReelle = (cle: string) => /^(sk|rk)_live_/.test(cle);

export function nouveauClient(cle: string, options: { host?: string; port?: number; protocol?: "http" | "https" } = {}): ClientStripe {
  return new Stripe(cle, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "Awrea Paris" }, telemetry: false, ...options });
}

/**
 * Ouvre la page de paiement Stripe Checkout d'une commande. La clé d'idempotence protège d'un
 * nouvel essai réseau pour la même commande enregistrée ; un double envoi du formulaire est arrêté
 * plus tôt, par l'empreinte de la commande (app/api/checkout).
 */
export async function creerSession(client: ClientStripe, order: Order, params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; url: string; expireLe: string; test: boolean }> {
  const s = await client.checkout.sessions.create(params, { idempotencyKey: cleIdempotence("session", order.id) });
  if (!s.url) throw new Error("Stripe n’a pas renvoyé d’adresse de paiement.");
  return { id: s.id, url: s.url, expireLe: new Date(s.expires_at * 1000).toISOString(), test: !s.livemode };
}

export async function lireSession(client: ClientStripe, id: string): Promise<Stripe.Checkout.Session> {
  return client.checkout.sessions.retrieve(id);
}

/**
 * Rembourse tout ou partie d'un paiement. `cle` distingue chaque remboursement voulu (la commande
 * entière, ou tel retour) : le même remboursement demandé deux fois ne part qu'une fois.
 */
export async function rembourser(
  client: ClientStripe,
  p: { intention: string; montant: number; commande: string; numero: string; motif: string; cle: { quoi: "remboursement" | "retour"; id: string } },
): Promise<{ id: string; statut: string; montant: number; totalCharge?: number }> {
  if (!Number.isInteger(p.montant) || p.montant <= 0) throw new Error("Montant de remboursement invalide.");
  const r = await client.refunds.create(
    // la charge est relue avec le remboursement : son montant remboursé fait foi pour la boutique
    { payment_intent: p.intention, amount: p.montant, reason: "requested_by_customer", metadata: { commande: p.commande, numero: p.numero, motif: p.motif.slice(0, 200) }, expand: ["charge"] },
    { idempotencyKey: cleIdempotence(p.cle.quoi, p.cle.id) },
  );
  const charge = r.charge && typeof r.charge === "object" ? r.charge : null;
  return { id: r.id, statut: r.status ?? "pending", montant: r.amount, ...(charge ? { totalCharge: charge.amount_refunded } : {}) };
}

/** Vérifie la signature d'un webhook (corps brut, en-tête Stripe-Signature, secret du webhook). */
export function verifierWebhook(client: ClientStripe, corps: string, signature: string | null, secret: string): Stripe.Event {
  if (!signature) throw new Error("Signature absente.");
  return client.webhooks.constructEvent(corps, signature, secret);
}
