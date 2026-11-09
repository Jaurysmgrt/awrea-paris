/**
 * Rapprochement des paiements Stripe avec les commandes de la boutique : ce qu'un événement (webhook
 * signé, ou retour de la cliente relu chez Stripe) change à la commande, et la suite qu'il appelle.
 *
 * Le stockage, les commandes et les envois sont passés en paramètre : lib/paiement/suivi.ts branche
 * les vrais, les tests unitaires des doublures en mémoire. Aucune règle n'est cachée dans un appel
 * réseau, et chaque chemin (événement rejoué, commande introuvable, finalisation reprise,
 * remboursement redemandé) se vérifie sans Stripe.
 */
import type Stripe from "stripe";
import type { Order } from "@/lib/commerce/types";
import { EVENEMENTS_ECOUTES, reperesDe, statutApresRemboursement, suivreEvenement, type Suite } from "@/lib/paiement/evenements";
import { avecEvenement, paiementEnAttente, type EvenementPaiement, type Paiement } from "@/lib/paiement/types";

export const TRENTE_JOURS = 60 * 60 * 24 * 30;

export interface Branchements {
  /** verrou atomique à jeton (SET NX PX) et sa restitution */
  prendre(cle: string, jeton: string, dureeMs: number): Promise<boolean>;
  rendre(cle: string, jeton: string): Promise<void>;
  /** compteur qui expire, et sa lecture */
  incr(cle: string, ttlSecondes: number): Promise<number>;
  peek(cle: string): Promise<number>;
  get<T>(cle: string): Promise<T | null>;
  set<T>(cle: string, valeur: T): Promise<void>;
  /** met à jour une commande enregistrée (sous verrou), null si elle n'existe pas */
  majCommande(id: string, change: (o: Order) => Order): Promise<Order | null>;
  /** commande payée : « reçue », facture, certificats, e-mail ; lève si une étape a échoué */
  finaliser(o: Order, premiere: boolean): Promise<void>;
  /** remboursement total constaté chez Stripe : la commande passe « Remboursée » */
  rembourseeChezStripe(o: Order, montant: number): Promise<void>;
  /** prévient la créatrice (journal de l'Atelier et e-mail) */
  alerter(o: Order | null, resume: string): Promise<void>;
  journaliser(o: Order, e: EvenementPaiement): Promise<void>;
  jeton(): string;
}

/** Un événement est déjà traité par un autre serveur : Stripe le renverra, puis il sera vu traité. */
export class EvenementEnCours extends Error {}
/** Stripe annonce une commande de la boutique que le stockage ne connaît pas. */
export class CommandeIntrouvable extends Error {}

export const indexIntention = (pi: string) => `paiement:intention:${pi}`;

/** Le paiement encaissé (réussi, remboursé en partie ou en entier, contesté). */
export const estEncaisse = (p?: Pick<Paiement, "statut"> | null) => p?.statut === "reussi" || p?.statut === "partiellement-rembourse" || p?.statut === "rembourse" || p?.statut === "conteste";

/**
 * Traite un événement reçu par le webhook (signature déjà vérifiée). « deja » : déjà traité, rien
 * n'est refait. L'événement n'est noté traité qu'une fois appliqué : s'il échoue, ou si le serveur
 * s'arrête en route, Stripe le renvoie et il est rejoué (chaque suite est sans doublon).
 */
export async function traiterEvenement(b: Branchements, event: Stripe.Event): Promise<"traite" | "deja" | "ignore"> {
  if (!(EVENEMENTS_ECOUTES as readonly string[]).includes(event.type)) return "ignore";
  const fait = `stripe:evenement:${event.id}`;
  if ((await b.peek(fait)) > 0) return "deja";
  const enCours = `${fait}:en-cours`;
  const jeton = b.jeton();
  if (!(await b.prendre(enCours, jeton, 120_000))) throw new EvenementEnCours(`Événement ${event.id} en cours de traitement.`);
  try {
    if ((await b.peek(fait)) > 0) return "deja";
    await appliquer(b, event);
    await b.incr(fait, TRENTE_JOURS);
    return "traite";
  } finally {
    await b.rendre(enCours, jeton).catch(() => {});
  }
}

/** Applique un événement à sa commande et donne la suite. */
export async function appliquer(b: Branchements, event: Stripe.Event): Promise<void> {
  const r = reperesDe(event);
  const id = r.commande ?? (r.intention ? await b.get<string>(indexIntention(r.intention)) : null);
  // paiement étranger à la boutique (autre usage du compte Stripe) : rien à faire
  if (!id) return;
  const etat: { suite: Suite; evenement?: EvenementPaiement } = { suite: "aucune" };
  const maj = await b.majCommande(id, (o) => {
    const s = suivreEvenement(o.payment ?? paiementEnAttente("stripe", o.total), event);
    etat.suite = s.suite;
    etat.evenement = s.evenement;
    return { ...o, payment: s.paiement, ...(s.paiement.moyen ? { paymentMethod: `Stripe · ${s.paiement.moyen}` } : {}) };
  });
  if (!maj?.payment) {
    // l'argent a pu être pris sans commande (stockage perdu, mauvais serveur) : la créatrice est
    // prévenue une fois, et l'erreur fait renvoyer l'événement par Stripe
    if ((await b.incr(`paiement:introuvable:${id}`, TRENTE_JOURS)) === 1) await b.alerter(null, `Stripe annonce un paiement (${event.type}) pour la commande ${id}, introuvable dans la boutique. Vérifiez le paiement dans le tableau de bord Stripe.`);
    throw new CommandeIntrouvable(`Commande ${id} introuvable (${event.type} ${event.id}).`);
  }
  const p = maj.payment;
  if (p.intention) await b.set(indexIntention(p.intention), maj.id);
  if (etat.evenement) await b.journaliser(maj, etat.evenement);
  // la finalisation se décide sur l'état du paiement, pas sur l'événement : une commande payée dont
  // la finalisation a échoué (ou a été coupée) est reprise au prochain événement, sans rien doubler
  if (p.statut === "reussi") await b.finaliser(maj, etat.suite === "finaliser");
  if (etat.suite === "rembourse") await b.rembourseeChezStripe(maj, p.rembourse);
  else if (etat.suite === "alerter" && etat.evenement) await b.alerter(maj, etat.evenement.resume);
}

/** Clé d'un remboursement voulu : la commande entière, ou tel retour. */
export const cleRemboursement = (c: { quoi: "remboursement" | "retour"; id: string }) => `${c.quoi}:${c.id}`;

/** Le remboursement déjà parti pour cette clé, s'il y en a un : il n'est jamais redemandé à Stripe. */
export function remboursementParti(p: Paiement, cle: string) {
  return p.remboursements?.find((r) => r.cle === cle) ?? null;
}

/**
 * Inscrit un remboursement envoyé à Stripe. Le montant remboursé est celui que Stripe donne pour la
 * charge quand il le donne ; sinon la somme des remboursements distincts. Jamais deux fois le même
 * remboursement (rejeu de Stripe, webhook arrivé entre-temps), jamais au-delà du montant payé.
 */
export function avecRemboursement(q: Paiement, r: { cle: string; id: string; montant: number; totalCharge?: number }, e: EvenementPaiement): Paiement {
  const liste = q.remboursements ?? [];
  const connu = liste.some((x) => x.id === r.id);
  const remboursements = connu ? liste : [...liste, { cle: r.cle, id: r.id, montant: r.montant, at: e.at }];
  const somme = remboursements.reduce((t, x) => t + x.montant, 0);
  const rembourse = Math.min(q.montant, Math.max(q.rembourse, somme, r.totalCharge ?? 0));
  const p = { ...q, remboursements, rembourse, statut: statutApresRemboursement(q, rembourse) };
  return connu ? p : avecEvenement(p, e);
}
