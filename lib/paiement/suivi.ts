/**
 * Suivi des paiements Stripe dans la base de la boutique : ouverture de la page de paiement, puis
 * synchronisation automatique de chaque événement (webhook signé) avec la commande, et historique
 * consultable dans l'Atelier (fiche de la commande, page Paiements), sur ordinateur comme dans
 * l'application.
 *
 * Client → site → page de paiement Stripe → webhook « paiement réussi » (ou retour de la cliente,
 * vérifié auprès de Stripe) → commande « reçue », facture, certificats, e-mail → Atelier.
 *
 * Idempotence : un événement déjà traité ne l'est jamais deux fois (son identifiant est gardé
 * trente jours) ; la finalisation n'a lieu qu'une fois par commande (lib/commerce/finalisation.ts) ;
 * une seule page de paiement par commande (clé d'idempotence de Stripe).
 */
import "server-only";
import type Stripe from "stripe";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { getOrder, setOrderStatus, updateOrder } from "@/lib/commerce/orders";
import { dejaRembourse, marquerRembourse } from "@/lib/commerce/argent";
import { finaliserCommande } from "@/lib/commerce/finalisation";
import { logAction } from "@/lib/agents/log";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/commerce/types";
import { EVENEMENTS_ECOUTES, reperesDe, suivreEvenement } from "@/lib/paiement/evenements";
import { parametresSession, type OptionsSession } from "@/lib/paiement/session";
import { creerSession, lireSession } from "@/lib/paiement/stripe-api";
import { avecEvenement, paiementEnAttente, type EvenementPaiement } from "@/lib/paiement/types";
import { clientPourPayer, clientStripe } from "@/lib/paiement/stripe";

const TRENTE_JOURS = 60 * 60 * 24 * 30;
const JOURNAL = "paiements:journal";
const indexIntention = (pi: string) => `paiement:intention:${pi}`;

export interface LigneJournal extends EvenementPaiement {
  commande: string;
  numero: string;
  test?: boolean;
}

export class PaiementError extends Error {}

/** Historique des événements de paiement, du plus récent au plus ancien (page Paiements). */
export async function journalPaiements(limite = 200): Promise<LigneJournal[]> {
  return kv.list<LigneJournal>(JOURNAL, limite);
}

async function journaliser(o: Order, e: EvenementPaiement, test?: boolean) {
  await kv.push<LigneJournal>(JOURNAL, { ...e, commande: o.id, numero: o.number, ...(test ? { test } : {}) }, 2000).catch((x) => console.error("[paiement] journal", x));
}

/**
 * Ouvre la page de paiement Stripe d'une commande enregistrée « en attente de paiement » et garde
 * ses références sur la commande. Renvoie l'adresse où envoyer la cliente.
 */
export async function ouvrirPaiement(order: Order, options: OptionsSession): Promise<string> {
  const client = clientPourPayer();
  if (!client) throw new PaiementError("Le paiement en ligne n’est pas ouvert.");
  const s = await creerSession(client, order, parametresSession(order, options));
  const e: EvenementPaiement = { at: new Date().toISOString(), type: "checkout.session.created", resume: "Page de paiement ouverte", reference: s.id, montant: order.total };
  await updateOrder(order.id, (o) => ({ ...o, payment: avecEvenement({ ...(o.payment ?? paiementEnAttente("stripe", o.total, s.test)), session: s.id, url: s.url, expireLe: s.expireLe, test: s.test || undefined }, e) }));
  await journaliser(order, e, s.test);
  return s.url;
}

/** Commande concernée par un événement : par ses métadonnées, sinon par son PaymentIntent. */
async function commandeDe(event: Stripe.Event): Promise<string | null> {
  const r = reperesDe(event);
  if (r.commande) return r.commande;
  if (r.intention) return kv.get<string>(indexIntention(r.intention));
  return null;
}

async function alerter(o: Order, resume: string) {
  const to = process.env.ATELIER_EMAIL ?? identity.email;
  await sendEmail({
    to,
    subject: `Paiement de la commande ${o.number} : ${resume.toLowerCase()}`,
    tag: "alerte",
    ...brandEmail({ preheader: resume, title: `Commande ${o.number}`, paragraphs: [resume, `Total de la commande : ${formatPrice(o.total)}. Le détail est dans l’Atelier, sur la fiche de la commande, et dans le tableau de bord Stripe.`], cta: { label: "Ouvrir la commande", href: `atelier:/commandes/${encodeURIComponent(o.number)}` } }),
  }).catch((e) => console.error("[paiement] alerte", e));
}

/** Applique un événement à sa commande (sous le verrou des commandes) et donne la suite. */
async function appliquer(event: Stripe.Event): Promise<void> {
  const id = await commandeDe(event);
  if (!id) {
    console.warn(`[paiement] ${event.type} ${event.id} : aucune commande de la boutique`);
    return;
  }
  const etat: { suite: ReturnType<typeof suivreEvenement>["suite"]; nouveau?: EvenementPaiement } = { suite: "aucune" };
  const maj = await updateOrder(id, (o) => {
    const avant = o.payment ?? paiementEnAttente("stripe", o.total);
    const r = suivreEvenement(avant, event);
    etat.suite = r.suite;
    etat.nouveau = r.paiement.evenements.length > avant.evenements.length ? r.paiement.evenements[r.paiement.evenements.length - 1] : undefined;
    return { ...o, payment: r.paiement, ...(r.paiement.moyen ? { paymentMethod: `Stripe · ${r.paiement.moyen}` } : {}) };
  });
  if (!maj?.payment) return;
  const p = maj.payment;
  const { suite, nouveau } = etat;
  if (p.intention) await kv.set(indexIntention(p.intention), maj.id);
  if (nouveau) await journaliser(maj, nouveau, p.test);
  if (suite === "finaliser") {
    await finaliserCommande(maj);
    await logAction({ agent: "systeme", kind: "paiement", status: "done", summary: `Commande ${maj.number} payée (${formatPrice(p.montant)}${p.test ? ", mode test de Stripe" : ""})`, target: { type: "order", id: maj.id, label: maj.number, href: `atelier:/commandes/${encodeURIComponent(maj.number)}` } }).catch(() => {});
  } else if (suite === "rembourse") {
    // remboursement total fait depuis Stripe : la commande le dit, et l'Atelier ne la rembourse plus
    if (!(await dejaRembourse(maj.id))) await marquerRembourse(maj.id, { montant: p.rembourse, par: "Stripe" });
    await setOrderStatus(maj.id, "refunded");
  } else if (suite === "alerter" && nouveau) {
    await logAction({ agent: "systeme", kind: "paiement", status: "failed", summary: `Commande ${maj.number} : ${nouveau.resume}`, target: { type: "order", id: maj.id, label: maj.number, href: `atelier:/commandes/${encodeURIComponent(maj.number)}` } }).catch(() => {});
    await alerter(maj, nouveau.resume);
  }
}

/**
 * Traite un événement reçu par le webhook (signature déjà vérifiée). « deja » : déjà traité, rien
 * n'est refait. Une erreur relance l'événement plus tard (Stripe le renvoie tant qu'il échoue).
 */
export async function traiterEvenement(event: Stripe.Event): Promise<"traite" | "deja" | "ignore"> {
  if (!(EVENEMENTS_ECOUTES as readonly string[]).includes(event.type)) return "ignore";
  const cle = `stripe:evenement:${event.id}`;
  if ((await kv.incr(cle, TRENTE_JOURS)) !== 1) return "deja";
  try {
    await appliquer(event);
    return "traite";
  } catch (e) {
    await kv.del(cle).catch(() => {});
    throw e;
  }
}

/**
 * Retour de la cliente après le paiement : si le webhook n'est pas encore arrivé, la session est
 * relue chez Stripe (jamais crue sur parole) et le même chemin s'applique. Renvoie la commande à jour.
 */
export async function confirmerRetour(order: Order, sessionId: string): Promise<Order> {
  if (order.payment?.prestataire !== "stripe" || order.payment.statut !== "en-attente") return order;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || (order.payment.session && order.payment.session !== sessionId)) return order;
  const client = clientStripe();
  if (!client) return order;
  const s = await lireSession(client, sessionId).catch((e) => {
    console.error("[paiement] relecture de la session", e);
    return null;
  });
  if (!s || s.metadata?.commande !== order.id) return order;
  const synthese = { id: `retour_${s.id}`, object: "event", type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), livemode: s.livemode, data: { object: s } } as unknown as Stripe.Event;
  await appliquer(synthese);
  return (await getOrder(order.id)) ?? order;
}

/**
 * Rembourse par Stripe tout ou partie d'une commande payée par Stripe (geste de l'Atelier, proposition
 * d'un agent validée par la créatrice, retour). Appelé sous le verrou d'argent de la commande
 * (lib/commerce/argent.ts). `cle` : « remboursement » de la commande entière, ou « retour » R-… ;
 * la même demande deux fois ne rembourse qu'une fois (idempotence de Stripe).
 */
export async function rembourserParStripe(order: Order, montant: number, motif: string, cle: { quoi: "remboursement" | "retour"; id: string }): Promise<{ id: string; statut: string; montant: number }> {
  const p = order.payment;
  if (p?.prestataire !== "stripe") throw new PaiementError("Cette commande n’a pas été payée par Stripe.");
  if (!p.intention) throw new PaiementError(`Le paiement Stripe de la commande ${order.number} n’est pas encore confirmé : rien ne peut être remboursé.`);
  const reste = p.montant - p.rembourse;
  if (montant > reste) throw new PaiementError(`Il reste ${formatPrice(Math.max(0, reste))} à rembourser sur la commande ${order.number} : le remboursement demandé dépasse ce montant.`);
  const client = clientStripe();
  if (!client) throw new PaiementError("Stripe n’est pas configuré : le remboursement ne peut pas partir.");
  const { rembourser } = await import("@/lib/paiement/stripe-api");
  const r = await rembourser(client, { intention: p.intention, montant, commande: order.id, numero: order.number, motif, cle });
  const e: EvenementPaiement = { at: new Date().toISOString(), type: "atelier.remboursement", resume: `Remboursement envoyé à Stripe (${motif})${r.statut === "succeeded" ? "" : ", en cours"}`, reference: r.id, montant: r.montant };
  const maj = await updateOrder(order.id, (o) => {
    const q = o.payment ?? p;
    const rembourse = Math.min(q.montant, q.rembourse + r.montant);
    return { ...o, payment: avecEvenement({ ...q, rembourse, statut: rembourse >= q.montant ? "rembourse" : "partiellement-rembourse" }, e) };
  });
  await journaliser(maj ?? order, e, p.test);
  return r;
}
