/**
 * Ce qu'un événement Stripe change au paiement d'une commande : module pur, sans stockage ni appel
 * réseau, couvert par les tests unitaires. Les webhooks (app/api/webhooks/stripe) et le retour de la
 * cliente sur la page de confirmation passent tous deux par ici.
 *
 * Règles : un paiement réussi ne redevient jamais « en attente » ni « expiré » ; un remboursement se
 * lit dans le montant remboursé de la charge (partiel ou total) ; une contestation alerte la créatrice.
 */
import type Stripe from "stripe";
import { avecEvenement, type Paiement } from "@/lib/paiement/types";

export type Suite = "finaliser" | "alerter" | "rembourse" | "aucune";

const MARQUES: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", cartes_bancaires: "Cartes Bancaires", discover: "Discover", jcb: "JCB", unionpay: "UnionPay", diners: "Diners" };
const PORTEFEUILLES: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay", link: "Link", samsung_pay: "Samsung Pay" };
const MOYENS: Record<string, string> = { paypal: "PayPal", sepa_debit: "Prélèvement SEPA", bancontact: "Bancontact", ideal: "iDEAL", klarna: "Klarna", link: "Link", revolut_pay: "Revolut Pay" };

/** Moyen de paiement en clair, sans aucune donnée de carte (ni numéro ni date). */
export function moyenDe(details: Stripe.Charge.PaymentMethodDetails | null | undefined): string | undefined {
  if (!details) return undefined;
  if (details.type === "card" && details.card) {
    const wallet = details.card.wallet?.type;
    if (wallet && PORTEFEUILLES[wallet]) return PORTEFEUILLES[wallet];
    return `Carte ${MARQUES[details.card.brand ?? ""] ?? "bancaire"}`;
  }
  return MOYENS[details.type] ?? details.type;
}

const idDe = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : x?.id);

/** Applique un événement Stripe au paiement ; renvoie le paiement mis à jour et la suite à donner. */
export function suivreEvenement(p: Paiement, event: Stripe.Event, maintenant = new Date()): { paiement: Paiement; suite: Suite } {
  const at = new Date((event.created ?? Math.floor(maintenant.getTime() / 1000)) * 1000).toISOString();
  const reussi = p.statut === "reussi" || p.statut === "rembourse" || p.statut === "partiellement-rembourse" || p.statut === "conteste";
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      const intention = idDe(s.payment_intent) ?? p.intention;
      // déjà réussi (le webhook et le retour de la cliente arrivent tous deux) : rien ne change
      if (reussi) return { paiement: p, suite: "aucune" };
      const base = { ...p, session: s.id, intention, test: !s.livemode || undefined };
      if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
        const paiement = avecEvenement({ ...base, statut: "reussi" }, { at, type: event.type, resume: "Paiement réussi", reference: intention ?? s.id, montant: s.amount_total ?? p.montant });
        return { paiement, suite: "finaliser" };
      }
      return { paiement: avecEvenement(base, { at, type: event.type, resume: "Paiement envoyé, en attente de validation par la banque", reference: s.id }), suite: "aucune" };
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object;
      return { paiement: avecEvenement({ ...p, statut: reussi ? p.statut : "echoue" }, { at, type: event.type, resume: "Paiement refusé par la banque", reference: s.id }), suite: "aucune" };
    }
    case "checkout.session.expired": {
      const s = event.data.object;
      return { paiement: avecEvenement({ ...p, statut: reussi ? p.statut : "expire" }, { at, type: event.type, resume: "Page de paiement expirée sans paiement", reference: s.id }), suite: "aucune" };
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const raison = pi.last_payment_error?.message ? ` (${pi.last_payment_error.message.slice(0, 160)})` : "";
      return { paiement: avecEvenement({ ...p, intention: pi.id }, { at, type: event.type, resume: `Tentative de paiement refusée${raison}`, reference: pi.id }), suite: "aucune" };
    }
    case "charge.succeeded": {
      const c = event.data.object;
      const moyen = moyenDe(c.payment_method_details) ?? p.moyen;
      return { paiement: avecEvenement({ ...p, charge: c.id, intention: idDe(c.payment_intent) ?? p.intention, moyen }, { at, type: event.type, resume: `Paiement encaissé${moyen ? ` · ${moyen}` : ""}`, reference: c.id, montant: c.amount }), suite: "aucune" };
    }
    case "charge.refunded": {
      const c = event.data.object;
      const rembourse = Math.max(p.rembourse, c.amount_refunded ?? 0);
      const total = rembourse >= (c.amount ?? p.montant);
      const statut = p.statut === "conteste" ? p.statut : total ? "rembourse" : "partiellement-rembourse";
      return { paiement: avecEvenement({ ...p, charge: c.id, rembourse, statut }, { at, type: event.type, resume: total ? "Remboursement total" : "Remboursement partiel", reference: c.id, montant: rembourse }), suite: total ? "rembourse" : "aucune" };
    }
    case "refund.failed": {
      const r = event.data.object;
      return { paiement: avecEvenement(p, { at, type: event.type, resume: "Remboursement refusé par la banque", reference: r.id, montant: r.amount }), suite: "alerter" };
    }
    case "charge.dispute.created": {
      const d = event.data.object;
      return { paiement: avecEvenement({ ...p, statut: "conteste" }, { at, type: event.type, resume: "Paiement contesté par la cliente auprès de sa banque", reference: d.id, montant: d.amount }), suite: "alerter" };
    }
    case "charge.dispute.closed": {
      const d = event.data.object;
      const gagne = d.status === "won";
      return { paiement: avecEvenement({ ...p, statut: gagne ? (p.rembourse > 0 ? "partiellement-rembourse" : "reussi") : "rembourse" }, { at, type: event.type, resume: gagne ? "Contestation close en faveur de la Maison" : "Contestation perdue : somme rendue à la cliente", reference: d.id, montant: d.amount }), suite: "aucune" };
    }
    default:
      return { paiement: p, suite: "aucune" };
  }
}

/** Événements que la boutique écoute (à cocher sur le webhook, dans le tableau de bord Stripe). */
export const EVENEMENTS_ECOUTES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.succeeded",
  "charge.refunded",
  "refund.failed",
  "charge.dispute.created",
  "charge.dispute.closed",
] as const;

/** Identifiant de la commande et du PaymentIntent portés par l'événement, quand il y en a. */
export function reperesDe(event: Stripe.Event): { commande?: string; intention?: string } {
  const o = event.data.object as { object?: string; metadata?: Record<string, string> | null; payment_intent?: string | { id: string } | null; client_reference_id?: string | null; id?: string };
  const commande = o.metadata?.commande ?? o.client_reference_id ?? undefined;
  const intention = o.object === "payment_intent" ? o.id : idDe(o.payment_intent ?? null);
  return { ...(commande ? { commande } : {}), ...(intention ? { intention } : {}) };
}
