/**
 * Paramètres de la session Stripe Checkout d'une commande : module pur (sans appel à Stripe),
 * couvert par les tests unitaires (tests/unit/paiement.test.ts).
 *
 * La somme demandée par Stripe est TOUJOURS le total de la commande calculé par la boutique : les
 * lignes détaillées (pièces, livraison, emballage) ne sont envoyées que si leur somme tombe juste ;
 * sinon (remise, carte cadeau, droits d'export), une seule ligne « Commande AW-… » au montant exact.
 * Aucun moyen de paiement n'est imposé : Stripe propose ceux activés sur le compte de la Maison.
 */
import type Stripe from "stripe";
import { shop } from "@/content/settings";
import type { Order } from "@/lib/commerce/types";

/** Durée de validité d'une page de paiement (Stripe exige au moins 30 minutes). */
export const SESSION_MINUTES = 45;

export interface OptionsSession {
  locale: "fr" | "en";
  /** adresse de retour après paiement ; doit contenir {CHECKOUT_SESSION_ID} */
  retour: string;
  /** adresse de retour si la cliente renonce ou si le paiement n'aboutit pas */
  abandon: string;
  maintenant?: Date;
  libelles: { commande: string; livraison: string; emballage: string; taille: string };
}

type Ligne = Stripe.Checkout.SessionCreateParams.LineItem;

const ligne = (nom: string, montant: number, quantite = 1, description?: string): Ligne => ({
  quantity: quantite,
  price_data: { currency: "eur", unit_amount: montant, product_data: { name: nom.slice(0, 250), ...(description ? { description: description.slice(0, 500) } : {}) } },
});

/** Lignes détaillées de la commande, ou null si leur somme ne donne pas exactement le total. */
export function lignesDetaillees(order: Order, l: OptionsSession["libelles"]): Ligne[] | null {
  if (order.discount?.amount || order.giftCard?.amount || order.taxes?.export) return null;
  const lignes: Ligne[] = order.lines.map((x) => ligne(x.title, x.unitPrice, x.quantity, l.taille.replace("{taille}", x.size)));
  if (order.gift?.wrap) lignes.push(ligne(l.emballage, shop.giftWrapPrice));
  if (order.shipping.price > 0) lignes.push(ligne(`${l.livraison} · ${order.shipping.method}`, order.shipping.price));
  const somme = lignes.reduce((s, x) => s + (x.price_data?.unit_amount ?? 0) * (x.quantity ?? 1), 0);
  return somme === order.total ? lignes : null;
}

export function parametresSession(order: Order, o: OptionsSession): Stripe.Checkout.SessionCreateParams {
  if (!Number.isInteger(order.total) || order.total < 50) throw new Error("Montant de commande invalide pour un paiement en ligne.");
  if (!o.retour.includes("{CHECKOUT_SESSION_ID}")) throw new Error("L’adresse de retour doit porter l’identifiant de la session.");
  const metadata = { commande: order.id, numero: order.number };
  // la remise (privilège de bienvenue, code) se lit aussi sur la page de Stripe, sous la ligne unique
  const remise = order.discount?.amount ? ` · ${order.discount.label} : −${(order.discount.amount / 100).toFixed(2).replace(".", ",")} €` : "";
  const pieces = order.lines.map((x) => `${x.title} (${x.size})${x.quantity > 1 ? ` × ${x.quantity}` : ""}`).join(", ") + remise;
  const lignes = lignesDetaillees(order, o.libelles) ?? [ligne(o.libelles.commande.replace("{commande}", order.number), order.total, 1, pieces)];
  const maintenant = o.maintenant ?? new Date();
  return {
    mode: "payment",
    line_items: lignes,
    customer_email: order.email,
    client_reference_id: order.id,
    metadata,
    payment_intent_data: { description: `Commande ${order.number}`, metadata },
    locale: o.locale,
    submit_type: "pay",
    billing_address_collection: "auto",
    success_url: o.retour,
    cancel_url: o.abandon,
    expires_at: Math.floor(maintenant.getTime() / 1000) + SESSION_MINUTES * 60,
  };
}

/** Clé d'idempotence d'une opération Stripe : la même demande deux fois ne fait qu'une opération. */
export const cleIdempotence = (quoi: "session" | "remboursement" | "retour", id: string) => `awrea-${quoi}-${id}`.slice(0, 255);
