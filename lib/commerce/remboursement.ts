/**
 * Ce qu'une cliente a réellement payé pour des pièces de sa commande : le prix du catalogue moins
 * la remise, avec les taxes d'exportation et la carte cadeau réparties au prorata. C'est ce montant
 * qui lui est remboursé pour un retour (par Stripe, et sur l'avoir), jamais le prix du catalogue :
 * une commande avec remise n'est pas trop remboursée, une commande d'exportation pas trop peu.
 *
 * Module pur, testé dans tests/unit/paiement.test.ts.
 */
import { shop } from "@/content/settings";
import type { Order } from "@/lib/commerce/types";

/**
 * Part payée de chaque pièce dont on donne le prix du catalogue (centimes), dans l'ordre donné.
 * La livraison et l'emballage cadeau restent hors des pièces.
 */
export function partsPayees(order: Pick<Order, "lines" | "discount" | "gift" | "shipping" | "total">, prixUnitaires: number[], prixEmballage = shop.giftWrapPrice): number[] {
  const valeur = order.lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  if (valeur <= 0) return prixUnitaires.map(() => 0);
  const remise = Math.min(valeur, order.discount?.amount ?? 0);
  const emballage = order.gift?.wrap ? prixEmballage : 0;
  const base = valeur - remise + emballage + (order.shipping.price ?? 0);
  // ce que la cliente a réglé pour les pièces : le total payé, au prorata de leur part
  const pieces = base > 0 ? (order.total * (valeur - remise)) / base : 0;
  return prixUnitaires.map((u) => Math.max(0, Math.round((pieces * u) / valeur)));
}
