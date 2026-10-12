/**
 * Pilote catalogue « démo » : données locales + surcouches persistées
 * (stocks, prix, pièces ajoutées ou retirées par les agents).
 */
import { products as baseProducts } from "@/data/demo/products";
import { collections as baseCollections, looks as baseLooks } from "@/data/demo/collections";
import { kv } from "@/lib/store";
import type { Collection, Look, Product } from "./types";

export const DEMO_KEYS = {
  stock: "demo:stock", // { [variantId]: quantity }
  produced: "demo:produced", // { [handle]: produced }
  price: "demo:price", // { [handle]: cents }
  extra: "demo:products:extra", // Product[] publiés par l'agent Catalogue
  removed: "demo:products:removed", // handles retirés
  patches: "demo:products:patch", // { [handle]: Partial<Product> } (SEO, textes)
} as const;

export async function demoProducts(): Promise<Product[]> {
  const [stock, produced, price, extra, removed, patches] = await Promise.all([
    kv.get<Record<string, number>>(DEMO_KEYS.stock),
    kv.get<Record<string, number>>(DEMO_KEYS.produced),
    kv.get<Record<string, number>>(DEMO_KEYS.price),
    kv.get<Product[]>(DEMO_KEYS.extra),
    kv.get<string[]>(DEMO_KEYS.removed),
    kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches),
  ]);
  const all = [...baseProducts, ...(extra ?? [])].filter((p) => !(removed ?? []).includes(p.handle));
  return all.map((p) => {
    const patch = patches?.[p.handle] ?? {};
    return {
      ...p,
      ...patch,
      price: price?.[p.handle] ?? p.price,
      edition: { ...p.edition, produced: produced?.[p.handle] ?? p.edition.produced },
      variants: p.variants.map((v) => ({ ...v, quantity: stock?.[v.id] ?? v.quantity })),
    };
  });
}

export async function demoCollections(): Promise<Collection[]> {
  const extra = (await kv.get<Product[]>(DEMO_KEYS.extra)) ?? [];
  return baseCollections.map((c) => ({
    ...c,
    products: [...c.products, ...extra.filter((p) => p.collection === c.handle).map((p) => p.handle)],
  }));
}

export async function demoLooks(): Promise<Look[]> {
  return baseLooks;
}
