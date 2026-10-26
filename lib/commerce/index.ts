/**
 * Point d'entrée commerce. Choisit le pilote selon la configuration :
 * Shopify (Storefront API) si les variables sont présentes, sinon le catalogue de démonstration.
 *
 * Langue : les pièces et les collections destinées aux pages (getProducts, getProduct,
 * getProductsByHandles, getPublicProducts, getCollections, getCollection, getCurrentCollection)
 * sont dans la langue de la requête, ou dans celle donnée : sous /en, leurs textes viennent de
 * content/site/en/catalogue-pieces.json (lib/commerce/translations.ts), avec repli sur le
 * français. getAllProducts reste la source brute, en français (Atelier, agents, panier). Les
 * fichiers servis sans requête de page (flux, plan du site, llms.txt) demandent le français.
 */
import { cache } from "react";
import { shopifyCollections, shopifyEnabled, shopifyProducts } from "@/lib/shopify/storefront";
import { demoCollections, demoLooks, demoProducts } from "./catalog-demo";
import { hideUpcoming } from "@/lib/drops";
import { findDoc } from "@/lib/edition/read";
import { getLocale } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/routing";
import { CATALOGUE_TRANSLATIONS_DOC, translateCollections, translatePieces, type CatalogueTranslations } from "./translations";
import type { Collection, Look, Product, ProductFilter } from "./types";

/** Traductions des fiches dans une langue (aucune en français, la langue du catalogue). */
const translationsOf = cache(async (locale: Locale): Promise<CatalogueTranslations | null> => {
  if (locale === DEFAULT_LOCALE) return null;
  return findDoc<CatalogueTranslations>(CATALOGUE_TRANSLATIONS_DOC, locale, { plain: true }).catch(() => null);
});

async function inLocale(list: Product[], locale?: Locale): Promise<Product[]> {
  return translatePieces(list, await translationsOf(locale ?? (await getLocale())));
}

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
export async function getProducts(filter: ProductFilter = {}, locale?: Locale): Promise<Product[]> {
  const all = await inLocale(await hideUpcoming(await getAllProducts()), locale);
  return all.filter((p) => {
    if (!orderable(p)) return false;
    if (filter.collection && p.collection !== filter.collection) return false;
    if (filter.category && p.category !== filter.category) return false;
    if (filter.size && !p.variants.some((v) => v.size === filter.size)) return false;
    return true;
  });
}

export async function getProduct(handle: string, locale?: Locale): Promise<Product | null> {
  const found = (await getAllProducts()).find((p) => p.handle === handle);
  return found ? ((await inLocale([found], locale))[0] ?? null) : null;
}

export async function getProductsByHandles(handles: string[], { includeUpcoming = false, locale }: { includeUpcoming?: boolean; locale?: Locale } = {}): Promise<Product[]> {
  const all = includeUpcoming ? await getAllProducts() : await hideUpcoming(await getAllProducts());
  return inLocale(handles.map((h) => all.find((p) => p.handle === h)).filter((p): p is Product => Boolean(p)), locale);
}

/** Pièces visibles publiquement (listes, recherche, flux, plan du site) : sans les pièces d'une collection pas encore dévoilée. */
export async function getPublicProducts(locale?: Locale): Promise<Product[]> {
  return inLocale((await hideUpcoming(await getAllProducts())).filter(orderable), locale);
}

const allCollections = cache(async (): Promise<Collection[]> => {
  if (shopifyEnabled) {
    try {
      return await shopifyCollections();
    } catch (e) {
      console.error("[commerce] Collections Shopify indisponibles :", e);
    }
  }
  return demoCollections();
});

export async function getCollections(locale?: Locale): Promise<Collection[]> {
  return translateCollections(await allCollections(), await translationsOf(locale ?? (await getLocale())));
}

export async function getCollection(handle: string, locale?: Locale): Promise<Collection | null> {
  return (await getCollections(locale)).find((c) => c.handle === handle) ?? null;
}

export async function getCurrentCollection(locale?: Locale): Promise<Collection | null> {
  const all = await getCollections(locale);
  return all.find((c) => c.current) ?? all[0] ?? null;
}

export async function getLooks(): Promise<Look[]> {
  // Les silhouettes sont éditoriales : gérées localement (ou via un métaobjet Shopify à brancher ici)
  return demoLooks();
}
