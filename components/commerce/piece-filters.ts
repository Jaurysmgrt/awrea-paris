/**
 * Filtres des listes de pièces (page d'une collection, toutes les pièces), d'après la maquette
 * PAGE PRODUIT : Catégorie, Prix, Taille, Collection. Module pur, sans texte : les libellés viennent
 * des documents de contenu (« boutique », « collections »), les valeurs de l'adresse sont lues ici.
 *
 * Les filtres vivent dans l'adresse (?categorie=robe&taille=M) : une sélection se partage et se
 * rend côté serveur. Toute valeur inconnue de l'adresse est ignorée (liste blanche).
 */
import type { Category, Product, Size } from "@/lib/commerce/types";

export const FILTER_KEYS = ["categorie", "prix", "taille", "collection"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterValues = Partial<Record<FilterKey, string>>;
export type SearchParams = Record<string, string | string[] | undefined>;

/** Tranche de prix (document « boutique », filtres.prix) : bornes en euros, minimum inclus, maximum exclu. */
export interface PriceBand {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export interface FilterOption {
  value: string;
  label: string;
  /**
   * adresse propre à l'option (filtre Collection sur la page d'une collection : « Toutes les
   * collections » mène à toutes les pièces, une autre collection à sa page)
   */
  href?: string;
}

export interface FilterGroup {
  key: FilterKey;
  label: string;
  /** la première option, de valeur vide, est « Tout » */
  options: FilterOption[];
  /** valeur choisie ("" : tout) */
  value: string;
}

export const CATEGORY_ORDER: Category[] = ["robe", "body", "top", "jupe", "accessoire"];
export const SIZE_ORDER: Size[] = ["XS", "S", "M", "L", "XL", "TU"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export const inBand = (price: number, band: Pick<PriceBand, "min" | "max">) => {
  const euros = price / 100;
  return (band.min === undefined || euros >= band.min) && (band.max === undefined || euros < band.max);
};

/** Catégories, tailles et tranches de prix présentes parmi des pièces, dans l'ordre de la maquette. */
export function facets(products: Product[], bands: PriceBand[]) {
  return {
    categories: CATEGORY_ORDER.filter((c) => products.some((p) => p.category === c)),
    sizes: SIZE_ORDER.filter((s) => products.some((p) => p.variants.some((v) => v.size === s))),
    bands: bands.filter((b) => products.some((p) => inBand(p.price, b))),
  };
}

/** Valeurs de l'adresse, reconnues seulement si elles existent parmi les choix proposés. */
export function readFilters(sp: SearchParams, allowed: { categories: string[]; sizes: string[]; bands: PriceBand[]; collections: string[] }): FilterValues {
  const out: FilterValues = {};
  const categorie = one(sp.categorie);
  const taille = one(sp.taille);
  const prix = one(sp.prix);
  const collection = one(sp.collection);
  if (allowed.categories.includes(categorie)) out.categorie = categorie;
  if (allowed.sizes.includes(taille)) out.taille = taille;
  if (allowed.bands.some((b) => b.id === prix)) out.prix = prix;
  if (allowed.collections.includes(collection)) out.collection = collection;
  return out;
}

/** Pièces qui répondent à tous les filtres choisis. */
export function applyFilters(products: Product[], f: FilterValues, bands: PriceBand[]): Product[] {
  const band = bands.find((b) => b.id === f.prix);
  return products.filter(
    (p) =>
      (!f.categorie || p.category === f.categorie) &&
      (!f.taille || p.variants.some((v) => v.size === f.taille)) &&
      (!band || inBand(p.price, band)) &&
      (!f.collection || p.collection === f.collection),
  );
}

/** Paramètres de recherche d'une sélection, dans un ordre stable (adresses partageables). */
export function filterQuery(f: FilterValues, omit: FilterKey[] = []): string {
  const q = new URLSearchParams();
  for (const k of FILTER_KEYS) if (f[k] && !omit.includes(k)) q.set(k, f[k]!);
  return q.toString();
}

/** Vrai si l'adresse porte au moins un filtre (vue filtrée : pas d'indexation). */
export const hasFilterParams = (sp: SearchParams) => FILTER_KEYS.some((k) => one(sp[k]));
