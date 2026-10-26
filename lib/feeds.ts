/**
 * Flux produits pour Google Merchant Center (Shopping, fiches gratuites) et le catalogue Meta
 * (boutiques Instagram et Facebook) : format RSS 2.0 avec l'espace de noms Google, une entrée par
 * taille (variante) regroupée par pièce. Générés depuis le même catalogue que le site.
 *
 * Chaque pièce est créée sur demande, sans stock : elle se commande toujours. Google la déclare
 * « en stock » avec son délai de préparation (min_handling_time / max_handling_time, en jours
 * ouvrés : le délai de fabrication) ; Meta la déclare « disponible à la commande ». Le délai est
 * écrit avec les modèles du document « catalogue », comme sur le site.
 *
 * Visuels provisoires (images générées en attendant les shootings) : jamais envoyés à Google ni à
 * Meta. Ces plateformes ne montrent pas la mention « visuel provisoire » du site, et les fichiers
 * du site n'ont plus les métadonnées qui signalent une image générée. Une pièce sans vraie photo
 * reste donc hors des flux ; elle y entre seule dès que ses photos ne sont plus provisoires
 * (ACTIVATION.md, étape 12 ; LEGAL-A-COMPLETER.md).
 */
import "server-only";
import { getPublicProducts, getCollections } from "@/lib/commerce";
import { leadTimeText, type LeadTimeTemplates } from "@/lib/commerce/availability";
import { getDoc } from "@/lib/edition/read";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import { imageAt } from "@/lib/media";
import { absolute } from "@/lib/seo/metadata";
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import type { Image, Product, Variant } from "@/lib/commerce/types";

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

/** Disponibilité d'une pièce créée sur demande : toujours commandable. */
const availability = (target: FeedTarget) => (target === "google" ? "in_stock" : "available for order");

/** Photos envoyées aux plateformes : les vraies photographies seulement. */
export const feedImages = (p: Pick<Product, "images">): Image[] => p.images.filter((i) => !i.provisoire);

/** Délai de préparation (Google) : le délai de fabrication, en jours ouvrés (cinq par semaine). */
const handlingDays = (p: Product) => ({ min: p.leadTime.min * 5, max: p.leadTime.max * 5 });

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

/** Noms des catégories, lus dans le document « boutique » (« robe » → « Robes »). */
type Categories = Record<string, string>;

function item(p: Product, v: Variant, target: FeedTarget, collectionTitle: string | undefined, delai: LeadTimeTemplates, categories: Categories): string {
  const handling = handlingDays(p);
  const images = feedImages(p);
  const category = categories[p.category] ?? p.category;
  const size = v.size === "TU" ? "Taille unique" : v.size;
  const material = [...p.materials].sort((a, b) => b.percent - a.percent)[0]?.name;
  return [
    "<item>",
    tag("id", v.sku),
    tag("item_group_id", p.handle),
    tag("title", `${p.title} · ${size}`),
    tag("description", [p.tagline, ...p.description].join(" ").slice(0, 4900)),
    tag("link", absolute(`/boutique/${p.handle}`)),
    tag("image_link", imageUrl(images[0].src)),
    ...images.slice(1, 10).map((i) => tag("additional_image_link", imageUrl(i.src))),
    tag("availability", availability(target)),
    target === "google" ? tag("min_handling_time", handling.min) : "",
    target === "google" ? tag("max_handling_time", handling.max) : "",
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
    tag("custom_label_0", "Créée sur demande"),
    tag("custom_label_1", "Artisans français"),
    tag("custom_label_2", leadTimeText(p.leadTime, delai)),
    shipping(p),
    "</item>",
  ].join("");
}

export async function buildFeed(target: FeedTarget): Promise<string> {
  const [products, collections, t, b] = await Promise.all([
    getPublicProducts("fr"),
    getCollections("fr"),
    getDoc<CatalogueTexts>("catalogue", "fr", { plain: true }),
    getDoc<{ categories: Categories }>("boutique", "fr", { plain: true }),
  ]);
  const titles = new Map(collections.map((c) => [c.handle, c.title]));
  const items = products
    .filter((p) => feedImages(p).length && p.variants.length)
    .flatMap((p) => p.variants.map((v) => item(p, v, target, titles.get(p.collection), t.delai, b.categories)));
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
