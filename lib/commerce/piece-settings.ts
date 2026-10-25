/**
 * Réglages d'une pièce par la créatrice (Atelier › Catalogue) : prix, délai de fabrication et
 * indicateurs « prix provisoire », « délai provisoire », « nouveau ». Module pur, partagé par
 * l'enregistrement (lib/commerce/pieces.ts) et les tests unitaires.
 */
import type { LeadTime, Product } from "./types";

export interface PieceSettings {
  /** centimes */
  price?: number;
  priceProvisional?: boolean;
  leadTime?: LeadTime;
  leadTimeProvisional?: boolean;
  isNew?: boolean;
}

/**
 * Réglages réellement différents de ceux de la pièce : rien d'autre n'est écrit. Décocher
 * « provisoire » ne réécrit donc jamais le prix (ni, avec Shopify, les prix de chaque taille).
 */
export function changedSettings(p: Pick<Product, "price" | "priceProvisional" | "leadTime" | "leadTimeProvisional" | "isNew">, s: PieceSettings): PieceSettings {
  return {
    ...(s.price !== undefined && s.price !== p.price ? { price: s.price } : {}),
    ...(s.priceProvisional !== undefined && s.priceProvisional !== Boolean(p.priceProvisional) ? { priceProvisional: s.priceProvisional } : {}),
    ...(s.leadTime && (s.leadTime.min !== p.leadTime.min || s.leadTime.max !== p.leadTime.max) ? { leadTime: { min: s.leadTime.min, max: s.leadTime.max } } : {}),
    ...(s.leadTimeProvisional !== undefined && s.leadTimeProvisional !== Boolean(p.leadTimeProvisional) ? { leadTimeProvisional: s.leadTimeProvisional } : {}),
    ...(s.isNew !== undefined && s.isNew !== Boolean(p.isNew) ? { isNew: s.isNew } : {}),
  };
}
