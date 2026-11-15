/**
 * Privilège de bienvenue (cahier du site du 10/11, § 8 et 9 ; réponses de la Maison) : règles pures,
 * sans stockage ni réseau, partagées par le serveur, le récapitulatif de paiement et les tests.
 *
 * - 10 % sur une seule unité de la pièce la plus chère du panier, arrondis au centime ;
 * - ouvert par le clic dans l'e-mail de confirmation de l'inscription à la lettre, pour 14 jours ;
 * - pour une première commande, une seule fois par adresse e-mail (commandes sans compte comprises) ;
 * - non cumulable avec un autre code ; aucune pièce exclue ;
 * - réservé à l'ouverture du paiement, consommé au paiement réussi, libéré si le paiement n'aboutit
 *   pas ; jamais deux commandes pour le même privilège.
 */

import { cleCanonique } from "@/lib/crm/regles";

export const TAUX_PRIVILEGE = 10;
export const JOURS_PRIVILEGE = 14;
/** code porté par la remise d'une commande au privilège (Order.discount) */
export const CODE_PRIVILEGE = "PRIVILEGE";
const JOUR = 86_400_000;

/** État du privilège d'une adresse (clé « privilege:<empreinte de l'adresse> », sans l'adresse en clair). */
export interface EtatPrivilege {
  ouvertLe: string;
  expireLe: string;
  /** commande dont le paiement est ouvert avec ce privilège */
  reservation?: { commande: string; le: string };
  /** commande payée avec ce privilège : il ne sert plus jamais */
  utilise?: { commande: string; le: string };
}

export interface LignePrivilege {
  handle: string;
  title: string;
  size: string;
  unitPrice: number;
  quantity: number;
}

export interface RemisePrivilege {
  handle: string;
  titre: string;
  taille: string;
  prixUnitaire: number;
  /** centimes retirés */
  montant: number;
}

/**
 * La remise : une seule unité de la pièce la plus chère du panier (à prix égal, la première),
 * 10 % de son prix arrondis au centime le plus proche. Null pour un panier sans pièce payante.
 */
export function remisePrivilege(lignes: readonly LignePrivilege[], taux = TAUX_PRIVILEGE): RemisePrivilege | null {
  let plusChere: LignePrivilege | null = null;
  for (const l of lignes) if (l.quantity > 0 && Number.isInteger(l.unitPrice) && l.unitPrice > 0 && (!plusChere || l.unitPrice > plusChere.unitPrice)) plusChere = l;
  if (!plusChere) return null;
  const montant = Math.round((plusChere.unitPrice * taux) / 100);
  return montant > 0 ? { handle: plusChere.handle, titre: plusChere.title, taille: plusChere.size, prixUnitaire: plusChere.unitPrice, montant } : null;
}

/** Privilège ouvert par la confirmation de l'inscription, pour 14 jours. */
export const ouvrir = (maintenant: Date): EtatPrivilege => ({ ouvertLe: maintenant.toISOString(), expireLe: new Date(maintenant.getTime() + JOURS_PRIVILEGE * JOUR).toISOString() });

export type RaisonRefus = "aucun" | "utilise" | "expire" | "deja-cliente" | "code" | "occupe";

/** Ce que devient la commande qui tient la réservation (`commandeEncorePayable`). */
export type EtatReservation = "libre" | "payable" | "payee" | "en-cours";

/**
 * Le privilège s'applique-t-il à une commande de cette adresse ? Ouvert, non expiré, jamais utilisé,
 * pour une première commande, sans autre code. Une réservation par une autre commande encore
 * payable n'est pas un refus : son ancienne page de paiement sera fermée (`decisionReservation`).
 * Mais une réservation tenue par une commande payée, ou dont le paiement est parti en attente de la
 * banque (prélèvement SEPA), ou qui s'enregistre à l'instant, l'est : la remise n'est ni affichée ni
 * retirée, et la nouvelle commande passe au prix entier (jamais de blocage en boucle).
 */
export function eligibilite(p: EtatPrivilege | null, c: { maintenant: Date; dejaCliente: boolean; code: boolean; reservation?: EtatReservation | null }): { ok: true } | { ok: false; raison: RaisonRefus } {
  if (!p) return { ok: false, raison: "aucun" };
  if (p.utilise) return { ok: false, raison: "utilise" };
  if (c.maintenant.getTime() > Date.parse(p.expireLe)) return { ok: false, raison: "expire" };
  if (c.dejaCliente) return { ok: false, raison: "deja-cliente" };
  if (c.reservation === "payee") return { ok: false, raison: "utilise" };
  if (c.reservation === "en-cours") return { ok: false, raison: "occupe" };
  if (c.code) return { ok: false, raison: "code" };
  return { ok: true };
}

/**
 * Part de la carte cadeau (démonstration) dans une commande au privilège : elle ne paie jamais plus
 * que ce qui reste dû pour les pièces et l'emballage une fois la remise retirée.
 */
export const partCarteCadeau = (carte: number, du: number): number => Math.max(0, Math.min(carte, du));

/**
 * Réservation pour la commande `commande` : la prendre, la garder (même commande), ou demander si la
 * commande qui la tient peut encore payer (« autre »). Le privilège utilisé ou expiré se refuse.
 */
export function decisionReservation(p: EtatPrivilege, commande: string, maintenant: Date): { action: "reserver" } | { action: "deja" } | { action: "autre"; commande: string } | { action: "refuser"; raison: "utilise" | "expire" } {
  if (p.utilise) return p.utilise.commande === commande ? { action: "deja" } : { action: "refuser", raison: "utilise" };
  if (p.reservation?.commande === commande) return { action: "deja" };
  if (maintenant.getTime() > Date.parse(p.expireLe)) return { action: "refuser", raison: "expire" };
  if (p.reservation) return { action: "autre", commande: p.reservation.commande };
  return { action: "reserver" };
}

export const reserver = (p: EtatPrivilege, commande: string, maintenant: Date): EtatPrivilege => ({ ...p, reservation: { commande, le: maintenant.toISOString() } });

/** Libère la réservation de cette commande seulement (paiement expiré, refusé, page non ouverte). */
export function liberer(p: EtatPrivilege, commande: string): EtatPrivilege {
  if (p.reservation?.commande !== commande) return p;
  const { reservation: _r, ...reste } = p;
  void _r;
  return reste;
}

/**
 * Paiement réussi : le privilège est utilisé par cette commande. Idempotent (rejouer le webhook ne
 * change rien) ; `conflit` si une autre commande l'avait déjà utilisé (à signaler à la créatrice).
 */
export function consommer(p: EtatPrivilege, commande: string, maintenant: Date): { etat: EtatPrivilege; change: boolean; conflit: boolean } {
  if (p.utilise) return { etat: p, change: false, conflit: p.utilise.commande !== commande };
  const { reservation: _r, ...reste } = p;
  void _r;
  return { etat: { ...reste, utilise: { commande, le: maintenant.toISOString() } }, change: true, conflit: false };
}

/**
 * La commande qui tient la réservation peut-elle encore payer ? Non si elle n'existe plus, si son
 * paiement a expiré ou échoué, ou si sa page de paiement a expiré sans paiement envoyé. Une commande
 * payée, ou dont le paiement est parti en attente de la banque, garde le privilège.
 */
export function commandeEncorePayable(o: { status: string; payment?: { statut: string; expireLe?: string; evenements?: { type: string }[] } } | null, maintenant: Date, reserveeLe?: string): EtatReservation {
  // commande pas encore enregistrée : une réservation de moins de dix minutes est une commande en
  // train de s'enregistrer (deux paiements simultanés), plus ancienne une commande abandonnée
  if (!o) return reserveeLe && maintenant.getTime() - Date.parse(reserveeLe) < 10 * 60_000 ? "en-cours" : "libre";
  if (o.status !== "pending") return "payee";
  const p = o.payment;
  if (!p) return "libre";
  if (p.statut === "expire" || p.statut === "echoue") return "libre";
  if (p.statut !== "en-attente") return "payee";
  if ((p.evenements ?? []).some((e) => e.type === "checkout.session.completed" || e.type === "checkout.session.async_payment_succeeded")) return "payee";
  if (p.expireLe && Date.parse(p.expireLe) <= maintenant.getTime()) return "libre";
  return "payable";
}

type CommandeVue = NonNullable<Parameters<typeof commandeEncorePayable>[0]> & { id: string; email: string };

/**
 * L'adresse a-t-elle déjà passé une commande (réponse de la créatrice du 12/11 : le privilège est
 * refusé à qui a déjà commandé, même si elle s'inscrit ensuite) ? Toute commande dont l'argent est
 * parti compte : payée, en confection, livrée, retournée, remboursée, mise de côté, ou payée par un
 * prélèvement encore en attente de la banque. Une commande abandonnée avant le paiement ne compte
 * pas. Les adresses se comparent par leur clé canonique (« +… » et points de Gmail ignorés).
 */
export function dejaCommande(commandes: readonly CommandeVue[], email: string, maintenant: Date, sauf?: string): boolean {
  const cle = cleCanonique(email);
  return commandes.some((o) => o.id !== sauf && typeof o.email === "string" && cleCanonique(o.email) === cle && commandeEncorePayable(o, maintenant) === "payee");
}
