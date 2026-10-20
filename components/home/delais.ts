/**
 * Délais de fabrication par famille de pièces, lus dans le catalogue (jamais écrits dans une page) :
 * les bodys et les tops d'un côté, les robes de l'autre. Le délai d'une famille va du plus court au
 * plus long de ses pièces ; sans pièce de la famille, le délai par défaut de ses catégories
 * (lib/commerce/availability.ts, modifiable dans l'Atelier pour chaque pièce).
 * Module pur, partagé par l'accueil et la page « La commande sur demande ».
 */
import { DEFAULT_LEAD_TIME } from "@/lib/commerce/availability";
import type { Category, LeadTime, Product } from "@/lib/commerce/types";

export type FamilleDelai = "hauts" | "robes";

export const FAMILLES: Record<FamilleDelai, Category[]> = {
  hauts: ["body", "top"],
  robes: ["robe"],
};

export function delaiDeFamille(pieces: Pick<Product, "category" | "leadTime">[], famille: FamilleDelai): LeadTime {
  const categories = FAMILLES[famille];
  const connus = pieces.filter((p) => categories.includes(p.category)).map((p) => p.leadTime);
  const source = connus.length ? connus : categories.map((c) => DEFAULT_LEAD_TIME[c]);
  return { min: Math.min(...source.map((t) => t.min)), max: Math.max(...source.map((t) => t.max)) };
}
