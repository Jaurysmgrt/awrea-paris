/**
 * Point d'entrée commerce. Choisit le pilote selon la configuration :
 * Shopify (Storefront API) si les variables sont présentes, sinon le catalogue de démonstration.
 */
import { cache } from "react";
import { shopifyCollections, shopifyEnabled, shopifyProducts } from "@/lib/shopify/storefront";
import { demoCollections, demoLooks, demoProducts } from "./catalog-demo";
import { productAvailability } from "./availability";
import { hideUpcoming } from "@/lib/drops";
import type { Collection, Look, Product, ProductFilter } from "./types";

export const commerceMode: "shopify" | "demo" = shopifyEnabled ? "shopify" : "demo";

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

/** Pièces de la boutique, sans celles d'un drop pas encore ouvert (lib/drops.ts). */
export async function getProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const all = await hideUpcoming(await getAllProducts());
  return all.filter((p) => {
    if (filter.collection && p.collection !== filter.collection) return false;
    if (filter.category && p.category !== filter.category) return false;
    if (filter.size && !p.variants.some((v) => v.size === filter.size && (v.quantity > 0 || v.preorder))) return false;
    if (filter.availability && filter.availability !== "all") {
      const a = productAvailability(p);
      if (filter.availability === "available" && a !== "available") return false;
      if (filter.availability === "preorder" && a !== "preorder") return false;
    }
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

/** Pièces visibles publiquement (listes, recherche, flux, plan du site) : sans les drops pas encore ouverts. */
export async function getPublicProducts(): Promise<Product[]> {
  return hideUpcoming(await getAllProducts());
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
