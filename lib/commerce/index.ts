/**
 * Point d'entrée commerce. Choisit le pilote selon la configuration :
 * Shopify (Storefront API) si les variables sont présentes, sinon le catalogue de démonstration.
 */
import { cache } from "react";
import { shopifyCollections, shopifyEnabled, shopifyProducts } from "@/lib/shopify/storefront";
import { demoCollections, demoLooks, demoProducts } from "./catalog-demo";
import { hideUpcoming } from "@/lib/drops";
import type { Collection, Look, Product, ProductFilter } from "./types";

export const commerceMode: "shopify" | "demo" = shopifyEnabled ? "shopify" : "demo";

/**
 * Une pièce se commande dès qu'elle a au moins une taille vendable. Une pièce Shopify dont aucune
 * taille n'est vendable (inventaire suivi sans « continuer à vendre ») reste dans l'Atelier mais
 * sort des listes publiques, plutôt que d'y offrir une fiche sans taille à choisir.
 */
const orderable = (p: Product) => p.variants.length > 0;

export const getAllProducts = cache(async (): Promise<Product[]> => {
  if (shopifyEnabled) {
    try {
      return await shopifyProducts();
    } catch (e) {
      console.error("[commerce] Shopify indisponible, repli sur la démo :", e);
    }
  }
  return demoProducts();
});

/**
 * Pièces de la boutique, sans les pièces d'une collection pas encore dévoilée (lib/drops.ts). Chaque pièce est
 * créée sur demande : le filtre de taille garde les pièces proposées dans cette taille.
 */
export async function getProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const all = await hideUpcoming(await getAllProducts());
  return all.filter((p) => {
    if (!orderable(p)) return false;
    if (filter.collection && p.collection !== filter.collection) return false;
    if (filter.category && p.category !== filter.category) return false;
    if (filter.size && !p.variants.some((v) => v.size === filter.size)) return false;
    return true;
  });
}

export async function getProduct(handle: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.handle === handle) ?? null;
}

export async function getProductsByHandles(handles: string[], { includeUpcoming = false }: { includeUpcoming?: boolean } = {}): Promise<Product[]> {
  const all = includeUpcoming ? await getAllProducts() : await hideUpcoming(await getAllProducts());
  return handles.map((h) => all.find((p) => p.handle === h)).filter((p): p is Product => Boolean(p));
}

/** Pièces visibles publiquement (listes, recherche, flux, plan du site) : sans les pièces d'une collection pas encore dévoilée. */
export async function getPublicProducts(): Promise<Product[]> {
  return (await hideUpcoming(await getAllProducts())).filter(orderable);
}

export const getCollections = cache(async (): Promise<Collection[]> => {
  if (shopifyEnabled) {
    try {
      return await shopifyCollections();
    } catch (e) {
      console.error("[commerce] Collections Shopify indisponibles :", e);
    }
  }
  return demoCollections();
});

export async function getCollection(handle: string): Promise<Collection | null> {
  return (await getCollections()).find((c) => c.handle === handle) ?? null;
}

export async function getCurrentCollection(): Promise<Collection | null> {
  const all = await getCollections();
  return all.find((c) => c.current) ?? all[0] ?? null;
}

export async function getLooks(): Promise<Look[]> {
  // Les silhouettes sont éditoriales : gérées localement (ou via un métaobjet Shopify à brancher ici)
  return demoLooks();
}
