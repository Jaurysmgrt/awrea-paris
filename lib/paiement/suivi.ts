/**
 * Suivi des paiements Stripe dans la base de la boutique : ouverture de la page de paiement, puis
 * synchronisation automatique de chaque événement (webhook signé) avec la commande, et historique
 * consultable dans l'Atelier (fiche de la commande, page Paiements), sur ordinateur comme dans
 * l'application.
 *
 * Client → site → page de paiement Stripe → webhook « paiement réussi » (ou retour de la cliente,
 * vérifié auprès de Stripe) → commande « reçue », facture, certificats, e-mail → Atelier.
 *
 * Les règles du rapprochement vivent dans lib/paiement/rapprochement.ts (testées sans réseau) ; ce
 * module y branche le stockage, les commandes, la finalisation et les alertes.
 *
 * Idempotence : un événement n'est noté traité qu'une fois appliqué (gardé trente jours) ; la
 * finalisation se reprend sans rien doubler (lib/commerce/finalisation.ts) ; un remboursement voulu
 * (la commande, tel retour) ne part qu'une fois, même redemandé des jours après.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { getOrder, setOrderStatus, updateOrder } from "@/lib/commerce/orders";
import { dejaRembourse, gesteEnCours, marquerRembourse } from "@/lib/commerce/argent";
import { finaliserCommande } from "@/lib/commerce/finalisation";
import { logAction } from "@/lib/agents/log";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/commerce/types";
import { parametresSession, type OptionsSession } from "@/lib/paiement/session";
import { creerSession, lireSession } from "@/lib/paiement/stripe-api";
import { avecEvenement, paiementEnAttente, type EvenementPaiement } from "@/lib/paiement/types";
import { clientPourPayer, clientStripe } from "@/lib/paiement/stripe";
import * as rapprochement from "@/lib/paiement/rapprochement";
import { signaler } from "@/lib/admin/push";
import { libererPrivilege } from "@/lib/privilege";

const JOURNAL = "paiements:journal";

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

async function journaliser(o: Order, e: EvenementPaiement) {
  await kv.push<LigneJournal>(JOURNAL, { ...e, commande: o.id, numero: o.number, ...(o.payment?.test ? { test: true } : {}) }, 2000).catch((x) => console.error("[paiement] journal", x));
}

const lienCommande = (o: Order) => `atelier:/commandes/${encodeURIComponent(o.number)}`;

async function alerter(o: Order | null, resume: string) {
  await signaler({ type: "intervention", titre: o ? `Paiement de la commande ${o.number}` : "Paiement à vérifier", texte: resume, chemin: o ? `/commandes/${encodeURIComponent(o.number)}` : "/paiements", etiquette: o ? `paiement-${o.number}` : "paiements" });
  await logAction({ agent: "systeme", kind: "paiement", status: "failed", summary: o ? `Commande ${o.number} : ${resume}` : resume, ...(o ? { target: { type: "order", id: o.id, label: o.number, href: lienCommande(o) } } : {}) }).catch(() => {});
  await sendEmail({
    to: process.env.ATELIER_EMAIL ?? identity.email,
    subject: o ? `Paiement de la commande ${o.number} : ${resume.toLowerCase()}` : "Paiement Stripe à vérifier",
    tag: "alerte",
    ...brandEmail({
      preheader: resume,
      title: o ? `Commande ${o.number}` : "Paiement à vérifier",
      paragraphs: [resume, ...(o ? [`Total de la commande : ${formatPrice(o.total)}. Le détail est dans l’Atelier, sur la fiche de la commande, et dans le tableau de bord Stripe.`] : [])],
      cta: o ? { label: "Ouvrir la commande", href: lienCommande(o) } : { label: "Ouvrir les paiements", href: "atelier:/paiements" },
    }),
  }).catch((e) => console.error("[paiement] alerte", e));
}

/** Le stockage, les commandes et les envois réels, branchés sur les règles du rapprochement. */
const branchements: rapprochement.Branchements = {
  prendre: (cle, jeton, ms) => kv.prendre(cle, jeton, ms),
  rendre: (cle, jeton) => kv.rendre(cle, jeton),
  incr: (cle, ttl) => kv.incr(cle, ttl),
  peek: (cle) => kv.peek(cle),
  get: (cle) => kv.get(cle),
  set: (cle, v) => kv.set(cle, v),
  majCommande: updateOrder,
  jeton: randomUUID,
  libererPrivilege: (o) => libererPrivilege(o.email, o.id),
  journaliser,
  alerter,
  async finaliser(o, premiere) {
    if (premiere) await logAction({ agent: "systeme", kind: "paiement", status: "done", summary: `Commande ${o.number} payée (${formatPrice(o.payment?.montant ?? o.total)}${o.payment?.test ? ", mode test de Stripe" : ""})`, target: { type: "order", id: o.id, label: o.number, href: lienCommande(o) } }).catch(() => {});
    await finaliserCommande(o);
  },
  async rembourseeChezStripe(o, montant) {
    await setOrderStatus(o.id, "refunded");
    // remboursé par l'Atelier (geste en cours, ou déjà inscrit sur le paiement) : rien à signaler
    const parAtelier = (o.payment?.remboursements ?? []).reduce((t, r) => t + r.montant, 0);
    if (parAtelier >= montant || (await dejaRembourse(o.id)) || (await gesteEnCours(o.id))) return;
    // remboursement total fait hors de l'Atelier (tableau de bord Stripe) : la commande le dit,
    // l'Atelier ne la rembourse plus, et la créatrice sait qu'aucun avoir n'a été émis par le site
    await marquerRembourse(o.id, { montant, par: "Stripe" });
    await alerter(o, `Remboursement total fait depuis le tableau de bord Stripe (${formatPrice(montant)}) : aucun avoir n’a été émis par le site, ni aucun e-mail envoyé à la cliente`);
  },
};

/**
 * Ouvre la page de paiement Stripe d'une commande enregistrée « en attente de paiement » et garde
 * ses références sur la commande. Renvoie l'adresse où envoyer la cliente.
 */
export async function ouvrirPaiement(order: Order, options: OptionsSession): Promise<string> {
  const client = clientPourPayer();
  if (!client) throw new PaiementError("Le paiement en ligne n’est pas ouvert.");
  const s = await creerSession(client, order, parametresSession(order, options));
  const e: EvenementPaiement = { at: new Date().toISOString(), type: "checkout.session.created", resume: "Page de paiement ouverte", reference: s.id, montant: order.total };
  const maj = await updateOrder(order.id, (o) => ({ ...o, payment: avecEvenement({ ...(o.payment ?? paiementEnAttente("stripe", o.total, s.test)), session: s.id, url: s.url, expireLe: s.expireLe, test: s.test || undefined }, e) }));
  await journaliser(maj ?? order, e);
  return s.url;
}

/**
 * La page de paiement n'a pas pu s'ouvrir : la commande le dit (paiement « échoué », sans page),
 * pour que l'Atelier ne l'attende pas et qu'aucun geste d'argent n'y soit proposé.
 */
export async function paiementNonOuvert(order: Order, raison: string): Promise<void> {
  const e: EvenementPaiement = { at: new Date().toISOString(), type: "atelier.ouverture", resume: `La page de paiement n’a pas pu s’ouvrir (${raison.slice(0, 120)})` };
  await updateOrder(order.id, (o) => ({ ...o, payment: avecEvenement({ ...(o.payment ?? paiementEnAttente("stripe", o.total)), statut: "echoue" }, e) })).catch(() => null);
}

/** Traite un événement reçu par le webhook (signature déjà vérifiée). */
export function traiterEvenement(event: Stripe.Event) {
  return rapprochement.traiterEvenement(branchements, event);
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
  await rapprochement.appliquer(branchements, synthese).catch((e) => console.error("[paiement] retour de la cliente", e));
  return (await getOrder(order.id)) ?? order;
}

/**
 * Rembourse par Stripe tout ou partie d'une commande payée par Stripe (geste de l'Atelier, proposition
 * d'un agent validée par la créatrice, retour). Appelé sous le verrou d'argent de la commande
 * (lib/commerce/argent.ts). `cle` : « remboursement » de la commande entière, ou « retour » R-… ;
 * un remboursement déjà parti pour cette clé n'est jamais redemandé (il est renvoyé tel quel).
 */
export async function rembourserParStripe(order: Order, montant: number, motif: string, cle: { quoi: "remboursement" | "retour"; id: string }): Promise<{ id: string; statut: string; montant: number }> {
  const p = order.payment;
  if (p?.prestataire !== "stripe") throw new PaiementError("Cette commande n’a pas été payée par Stripe.");
  const cleTexte = rapprochement.cleRemboursement(cle);
  const parti = rapprochement.remboursementParti(p, cleTexte);
  if (parti) return { id: parti.id, statut: "deja", montant: parti.montant };
  if (!p.intention || !rapprochement.estEncaisse(p)) throw new PaiementError(`Le paiement Stripe de la commande ${order.number} n’est pas encaissé : rien ne peut être remboursé.`);
  const reste = p.montant - p.rembourse;
  if (montant > reste) throw new PaiementError(`Il reste ${formatPrice(Math.max(0, reste))} à rembourser sur la commande ${order.number} : le remboursement demandé dépasse ce montant.`);
  const client = clientStripe();
  if (!client) throw new PaiementError("Stripe n’est pas configuré : le remboursement ne peut pas partir.");
  const { rembourser } = await import("@/lib/paiement/stripe-api");
  const r = await rembourser(client, { intention: p.intention, montant, commande: order.id, numero: order.number, motif, cle });
  const e: EvenementPaiement = { at: new Date().toISOString(), type: "atelier.remboursement", resume: `Remboursement envoyé à Stripe (${motif})${r.statut === "succeeded" ? "" : ", en cours"}`, reference: r.id, montant: r.montant };
  // inscrit aussitôt sur la commande : redemandé plus tard, ce remboursement ne repart pas
  const maj = await updateOrder(order.id, (o) => ({ ...o, payment: rapprochement.avecRemboursement(o.payment ?? p, { cle: cleTexte, id: r.id, montant: r.montant, totalCharge: r.totalCharge }, e) }));
  await journaliser(maj ?? order, e);
  return r;
}
