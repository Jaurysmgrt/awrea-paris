/**
 * Pilote catalogue « démo » : données locales + surcouches persistées (prix, délais de
 * fabrication et indicateurs « provisoire » réglés dans l'Atelier, pièces ajoutées ou retirées
 * par les agents). Aucun stock : chaque pièce est créée sur demande.
 */
import { products as baseProducts } from "@/data/demo/products";
import { collections as baseCollections, looks as baseLooks } from "@/data/demo/collections";
import { kv } from "@/lib/store";
import { DEFAULT_LEAD_TIME } from "./availability";
import type { Collection, LeadTime, Look, Product } from "./types";

/** Indicateurs réglés dans l'Atelier pour une pièce. */
export interface DemoFlags {
  priceProvisional?: boolean;
  leadTimeProvisional?: boolean;
  isNew?: boolean;
}

export const DEMO_KEYS = {
  price: "demo:price", // { [handle]: cents }
  leadTime: "demo:leadtime", // { [handle]: { min, max } } (semaines)
  flags: "demo:flags", // { [handle]: DemoFlags }
  extra: "demo:products:extra", // Product[] publiés par l'agent Catalogue
  removed: "demo:products:removed", // handles retirés
  patches: "demo:products:patch", // { [handle]: Partial<Product> } (SEO, textes)
} as const;

export async function demoProducts(): Promise<Product[]> {
  const [price, leadTime, flags, extra, removed, patches] = await Promise.all([
    kv.get<Record<string, number>>(DEMO_KEYS.price),
    kv.get<Record<string, LeadTime>>(DEMO_KEYS.leadTime),
    kv.get<Record<string, DemoFlags>>(DEMO_KEYS.flags),
    kv.get<Product[]>(DEMO_KEYS.extra),
    kv.get<string[]>(DEMO_KEYS.removed),
    kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches),
  ]);
  const all = [...baseProducts, ...(extra ?? [])].filter((p) => !(removed ?? []).includes(p.handle));
  return all.map((p) => {
    const patch = patches?.[p.handle] ?? {};
    const f = flags?.[p.handle] ?? {};
    return {
      ...p,
      ...patch,
      price: price?.[p.handle] ?? p.price,
      // pièce publiée avant le modèle « sur demande » : délai provisoire de sa catégorie, signalé
      // comme tel (même règle que le pilote Shopify sans métachamps de délai)
      leadTime: leadTime?.[p.handle] ?? p.leadTime ?? DEFAULT_LEAD_TIME[p.category] ?? DEFAULT_LEAD_TIME.robe,
      priceProvisional: f.priceProvisional ?? p.priceProvisional,
      leadTimeProvisional: f.leadTimeProvisional ?? p.leadTimeProvisional ?? (!leadTime?.[p.handle] && !p.leadTime),
      isNew: f.isNew ?? p.isNew,
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
