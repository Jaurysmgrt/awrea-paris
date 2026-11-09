/**
 * Pilote catalogue « démo » : données locales + surcouches persistées (prix, délais de
 * fabrication et indicateurs « provisoire » réglés dans l'Atelier, pièces ajoutées ou retirées
 * par les agents). Aucun stock : chaque pièce est créée sur demande.
 */
import { products as baseProducts } from "@/data/demo/products";
import { collections as baseCollections, looks as baseLooks } from "@/data/demo/collections";
import { kv } from "@/lib/store";
import { DEFAULT_LEAD_TIME } from "./availability";
import type { Collection, Look, Product } from "./types";
import type { StatutPiece } from "./statut-pieces";

/** Réglages d'une pièce par l'Atelier, gardés dans la surcouche des fiches (`DEMO_KEYS.patches`). */
export type DemoPieceSettings = Partial<Pick<Product, "leadTime" | "priceProvisional" | "leadTimeProvisional" | "isNew">>;

/**
 * Surcouches du catalogue de démonstration. Le délai de fabrication et les indicateurs
 * « provisoire » et « nouveau » vivent dans la surcouche des fiches (`patches`), avec les textes
 * revus par les agents : la remise à zéro de la démonstration les efface ensemble.
 */
export const DEMO_KEYS = {
  price: "demo:price", // { [handle]: cents }
  extra: "demo:products:extra", // Product[] publiés par l'agent Catalogue
  removed: "demo:products:removed", // handles retirés
  patches: "demo:products:patch", // { [handle]: Partial<Product> } (SEO, textes, délai, indicateurs)
  statut: "demo:products:statut", // { [handle]: "brouillon" | "archivee" } (absente : en ligne)
} as const;

/**
 * Pièces de la démonstration. Le site ne voit que les pièces en ligne ; l'Atelier (`{ tous: true }`)
 * voit aussi les brouillons et les pièces archivées, avec leur statut.
 */
export async function demoProducts(): Promise<Product[]>;
export async function demoProducts(o: { tous: true }): Promise<(Product & { statut: StatutPiece })[]>;
export async function demoProducts(o: { tous?: boolean } = {}): Promise<(Product & { statut?: StatutPiece })[]> {
  const [price, extra, removed, patches, statuts] = await Promise.all([
    kv.get<Record<string, number>>(DEMO_KEYS.price),
    kv.get<Product[]>(DEMO_KEYS.extra),
    kv.get<string[]>(DEMO_KEYS.removed),
    kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches),
    kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut),
  ]);
  const statutDe = (handle: string): StatutPiece => statuts?.[handle] ?? "en-ligne";
  const all = [...baseProducts, ...(extra ?? [])].filter((p) => !(removed ?? []).includes(p.handle) && (o.tous || statutDe(p.handle) === "en-ligne"));
  return all.map((p) => {
    const merged: Product = { ...p, ...(patches?.[p.handle] ?? {}) };
    // pièce publiée avant le modèle « sur demande » (sans délai) : délai provisoire de sa
    // catégorie, signalé comme tel
    const known = Boolean(merged.leadTime);
    return {
      ...merged,
      price: price?.[p.handle] ?? p.price,
      leadTime: known ? merged.leadTime : (DEFAULT_LEAD_TIME[p.category] ?? DEFAULT_LEAD_TIME.robe),
      leadTimeProvisional: merged.leadTimeProvisional ?? !known,
      ...(o.tous ? { statut: statutDe(p.handle) } : {}),
    };
  });
}

/**
 * Adresses déjà prises, même par une pièce retirée : une copie ou une nouvelle pièce n'en reprend
 * jamais une (elle hériterait des surcouches de l'ancienne, prix, textes et statut).
 */
export async function demoHandlesPris(): Promise<string[]> {
  const [extra, removed] = await Promise.all([kv.get<Product[]>(DEMO_KEYS.extra), kv.get<string[]>(DEMO_KEYS.removed)]);
  return [...baseProducts.map((p) => p.handle), ...(extra ?? []).map((p) => p.handle), ...(removed ?? [])];
}

export async function demoCollections(): Promise<Collection[]> {
  const [extra, statuts] = await Promise.all([kv.get<Product[]>(DEMO_KEYS.extra), kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut)]);
  // une pièce en brouillon ou archivée sort aussi de sa collection
  const enLigne = (handle: string) => (statuts?.[handle] ?? "en-ligne") === "en-ligne";
  return baseCollections.map((c) => ({
    ...c,
    products: [...c.products, ...(extra ?? []).filter((p) => p.collection === c.handle).map((p) => p.handle)].filter(enLigne),
  }));
}

export async function demoLooks(): Promise<Look[]> {
  return baseLooks;
}
