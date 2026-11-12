/**
 * Ce qu'une cliente a réellement payé pour des pièces de sa commande : le prix du catalogue moins
 * la remise, avec les taxes d'exportation et la carte cadeau réparties au prorata. C'est ce montant
 * qui lui est remboursé pour un retour (par Stripe, et sur l'avoir), jamais le prix du catalogue :
 * une commande avec remise n'est pas trop remboursée, une commande d'exportation pas trop peu.
 *
 * Remise d'un code : répartie sur toutes les pièces au prorata. Privilège de bienvenue : il porte
 * sur une seule unité (la pièce la plus chère, sa taille), comme sur la facture ; il ne se retire
 * donc que du remboursement de cette unité, et une seule fois pour toute la commande.
 *
 * Module pur, testé dans tests/unit/rapprochement.test.ts.
 */
import { shop } from "@/content/settings";
import type { Order } from "@/lib/commerce/types";

/** Une pièce rendue : son prix du catalogue, et de quoi la reconnaître (pièce et taille). */
export type PieceRendue = number | { unitPrice: number; handle?: string; size?: string };

/**
 * Part payée de chaque pièce rendue (centimes), dans l'ordre donné. La livraison et l'emballage
 * cadeau restent hors des pièces. `privilegeDejaRembourse` : l'unité au privilège a déjà été
 * remboursée par un retour précédent (sa remise ne se retire plus).
 */
export function partsPayees(order: Pick<Order, "lines" | "discount" | "gift" | "shipping" | "total" | "privilege">, pieces: PieceRendue[], prixEmballage = shop.giftWrapPrice, privilegeDejaRembourse = false): number[] {
  const rendues = pieces.map((p) => (typeof p === "number" ? { unitPrice: p } : p));
  const valeur = order.lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  if (valeur <= 0) return rendues.map(() => 0);
  const remise = Math.min(valeur, order.discount?.amount ?? 0);
  const emballage = order.gift?.wrap ? prixEmballage : 0;
  const base = valeur - remise + emballage + (order.shipping.price ?? 0);
  // ce que la cliente a réglé pour les pièces : le total payé, au prorata de leur part
  const payePieces = base > 0 ? (order.total * (valeur - remise)) / base : 0;
  const pv = order.privilege;
  if (!pv || !remise) return rendues.map((p) => Math.max(0, Math.round((payePieces * p.unitPrice) / valeur)));
  // privilège : chaque pièce à son prix, la remise sur la seule unité qui la porte ; puis la même
  // proportion que pour la commande (taxes d'exportation, carte cadeau)
  const k = valeur - remise > 0 ? payePieces / (valeur - remise) : 0;
  let aImputer = !privilegeDejaRembourse;
  return rendues.map((p) => {
    let net = p.unitPrice;
    if (aImputer && p.handle === pv.handle && p.size === pv.size) {
      net -= Math.min(remise, p.unitPrice);
      aImputer = false;
    }
    return Math.max(0, Math.round(k * net));
  });
}

/** Une pièce rendue est-elle l'unité qui porte le privilège (même pièce, même taille) ? */
export const porteLePrivilege = (order: Pick<Order, "privilege">, p: { handle?: string; size?: string }): boolean => Boolean(order.privilege && p.handle === order.privilege.handle && p.size === order.privilege.size);

interface RetourVu {
  id: string;
  status: string;
  items: { handle: string; size: string; unitPrice: number; wish: string }[];
}

/**
 * Parts payées des pièces à rembourser d'un retour (dans l'ordre de ces pièces), en tenant compte
 * des retours déjà remboursés de la même commande : le privilège ne se retire qu'une fois. Le même
 * calcul sert au bouton de l'Atelier (montant annoncé) et au remboursement (montant parti).
 */
export function partsDuRetour(order: Pick<Order, "lines" | "discount" | "gift" | "shipping" | "total" | "privilege">, retour: RetourVu, retoursDeLaCommande: readonly RetourVu[], prixEmballage = shop.giftWrapPrice): number[] {
  const aRembourser = retour.items.filter((i) => i.wish === "remboursement");
  const dejaRembourse = retoursDeLaCommande.some((x) => x.id !== retour.id && x.status === "rembourse" && x.items.some((i) => i.wish === "remboursement" && porteLePrivilege(order, i)));
  return partsPayees(order, aRembourser, prixEmballage, dejaRembourse);
}
