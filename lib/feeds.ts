/**
 * Flux produits pour Google Merchant Center (Shopping, fiches gratuites) et le catalogue Meta
 * (boutiques Instagram et Facebook) — format RSS 2.0 avec l'espace de noms Google, une entrée par
 * taille (variante) regroupée par pièce. Générés depuis le même catalogue que le site.
 * Les séries complètes (pièces adoptées) n'y figurent plus.
 */
import "server-only";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { editionInfo, variantAvailability } from "@/lib/commerce/availability";
import { imageAt } from "@/lib/media";
import { absolute } from "@/lib/seo/metadata";
import { identity } from "@/content/brand/identity";
import { boutique } from "@/content/fr/pages";
import { shop } from "@/content/settings";
import type { Product, Variant } from "@/lib/commerce/types";

export type FeedTarget = "google" | "meta";

/** Taxonomie Google (identifiants numériques) */
const GOOGLE_CATEGORY: Record<Product["category"], number> = {
  robe: 2271, // Vêtements > Robes
  jupe: 1581, // Vêtements > Jupes
  top: 212, // Vêtements > Hauts et chemises
  body: 212,
  accessoire: 177, // Accessoires > Écharpes et châles
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const money = (cents: number) => `${(cents / 100).toFixed(2)} ${identity.currency}`;
const tag = (name: string, value: string | number | undefined | null) => (value === undefined || value === null || value === "" ? "" : `<g:${name}>${esc(String(value))}</g:${name}>`);
const imageUrl = (src: string) => (src.startsWith("http") ? imageAt(src, 1200) : absolute(imageAt(src, 1200)));

export function productColor(p: Product): string {
  if (p.color) return p.color;
  const text = `${p.tagline} ${p.seo.description} ${p.images[0]?.alt ?? ""}`.toLowerCase();
  return /ivoire|écru|blanc/.test(text) ? "Ivoire" : "Noir";
}

function availability(p: Product, v: Variant, target: FeedTarget): { value: string; date?: string } {
  const a = variantAvailability(p, v);
  if (a === "preorder") {
    const date = new Date(Date.now() + (p.leadTimeWeeks ?? 4) * 7 * 86_400_000).toISOString().slice(0, 10);
    return { value: "preorder", date };
  }
  if (a === "soldout") return { value: target === "google" ? "out_of_stock" : "out of stock" };
  return { value: target === "google" ? "in_stock" : "in stock" };
}

function shipping(p: Product): string {
  const lines: string[] = [];
  for (const country of shop.countries) {
    const rate = shop.shippingRates.find((r) => r.zone === country.zone && r.price > 0);
    if (!rate) continue;
    const free = rate.freeAboveThreshold && p.price >= shop.freeShippingThreshold;
    lines.push(`<g:shipping><g:country>${country.code}</g:country><g:service>${esc(rate.label)}</g:service><g:price>${money(free ? 0 : rate.price)}</g:price></g:shipping>`);
  }
  return lines.join("");
}

function item(p: Product, v: Variant, target: FeedTarget, collectionTitle: string | undefined): string {
  const edition = editionInfo(p);
  const avail = availability(p, v, target);
  const category = boutique.categories.find((c) => c.value === p.category)?.label ?? p.category;
  const size = v.size === "TU" ? "Taille unique" : v.size;
  const material = [...p.materials].sort((a, b) => b.percent - a.percent)[0]?.name;
  return [
    "<item>",
    tag("id", v.sku),
    tag("item_group_id", p.handle),
    tag("title", `${p.title} — ${size}`),
    tag("description", [p.tagline, ...p.description].join(" ").slice(0, 4900)),
    tag("link", absolute(`/boutique/${p.handle}`)),
    tag("image_link", imageUrl(p.images[0].src)),
    ...p.images.slice(1, 10).map((i) => tag("additional_image_link", imageUrl(i.src))),
    tag("availability", avail.value),
    tag("availability_date", avail.date ? `${avail.date}T00:00+01:00` : undefined),
    tag("price", money(p.price)),
    tag("brand", identity.name),
    tag("condition", "new"),
    tag("identifier_exists", "no"),
    target === "google" ? tag("google_product_category", GOOGLE_CATEGORY[p.category]) : "",
    tag("product_type", `Prêt-à-porter > ${category}${collectionTitle ? ` > ${collectionTitle}` : ""}`),
    tag("gender", "female"),
    tag("age_group", "adult"),
    tag("color", productColor(p)),
    tag("size", size),
    tag("size_system", "FR"),
    tag("material", material),
    target === "meta" ? tag("inventory", v.quantity) : "",
    tag("custom_label_0", edition.unique ? "Pièce unique" : `Série de ${edition.total}`),
    tag("custom_label_1", "Fait main à Paris"),
    shipping(p),
    "</item>",
  ].join("");
}

export async function buildFeed(target: FeedTarget): Promise<string> {
  const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
  const titles = new Map(collections.map((c) => [c.handle, c.title]));
  const items = products
    .filter((p) => p.images.length && !(editionInfo(p).complete && !p.variants.some((v) => v.preorder)))
    .flatMap((p) => p.variants.map((v) => item(p, v, target, titles.get(p.collection))));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(identity.name)}</title>
<link>${esc(absolute("/"))}</link>
<description>${esc(identity.shortDescription)}</description>
${items.join("\n")}
</channel>
</rss>
`;
}
