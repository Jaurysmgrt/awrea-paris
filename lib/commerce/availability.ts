import type { Availability, Product, Variant } from "./types";

export interface EditionInfo {
  total: number;
  produced: number;
  remaining: number;
  nextNumber: number;
  unique: boolean;
  complete: boolean;
  /** « N° 3 / 5 », « Pièce unique », « Série complète » */
  label: string;
  /** « 3 pièces restantes », « Dernière pièce », … */
  remainingLabel: string;
}

export function editionInfo(p: Pick<Product, "edition">): EditionInfo {
  const { total, produced } = p.edition;
  const remaining = Math.max(0, total - produced);
  const unique = total === 1;
  const complete = remaining === 0;
  const nextNumber = Math.min(total, produced + 1);
  const label = unique ? "Pièce unique" : complete ? `Série complète · ${total} / ${total}` : `N° ${nextNumber} / ${total}`;
  const remainingLabel = complete
    ? "Série complète"
    : remaining === 1
      ? unique
        ? "Exemplaire unique"
        : "Dernière pièce de la série"
      : `${remaining} pièces restantes sur ${total}`;
  return { total, produced, remaining, nextNumber, unique, complete, label, remainingLabel };
}

export function stockTotal(p: Product): number {
  return p.variants.reduce((s, v) => s + v.quantity, 0);
}

export function variantAvailability(p: Product, v: Variant): Availability {
  if (v.quantity > 1) return "available";
  if (v.quantity === 1) return "low";
  return v.preorder ? "preorder" : "soldout";
}

/** Disponibilité globale d'une pièce */
export function productAvailability(p: Product): "available" | "preorder" | "soldout" {
  if (p.variants.some((v) => v.quantity > 0)) return "available";
  if (p.variants.some((v) => v.preorder)) return "preorder";
  return "soldout";
}

export function availabilityLabel(a: Availability | "available" | "preorder" | "soldout", leadTimeWeeks?: number): string {
  switch (a) {
    case "available":
      return "Disponible";
    case "low":
      return "Dernière pièce dans cette taille";
    case "preorder":
      return leadTimeWeeks ? `Sur commande · ${leadTimeWeeks} semaines` : "Sur commande";
    case "soldout":
      return "Épuisée";
  }
}

export function isPurchasable(p: Product, v: Variant): boolean {
  return v.quantity > 0 || v.preorder;
}
