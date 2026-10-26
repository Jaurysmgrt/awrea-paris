/**
 * Traductions des fiches (pièces et collections) pour la version anglaise du site.
 *
 * Les textes des pièces viennent du catalogue (Shopify, ou data/demo/products.ts en
 * démonstration), en français. Pour /en, leur traduction vit dans le document de contenu
 * content/site/en/catalogue-pieces.json, une entrée par identifiant (handle) :
 *
 *   {
 *     "pieces": {
 *       "body-aura": {
 *         "title": "…", "tagline": "…", "description": ["…", "…"], "details": ["…"],
 *         "fit": "…", "care": ["…"], "seo": { "title": "…", "description": "…" },
 *         "images": ["texte alternatif de la 1re photo", "…"], "detailImage": "…", "video": "…"
 *       }
 *     },
 *     "collections": {
 *       "hypnotic-lace": {
 *         "title": "…", "season": "…", "lead": "…", "intention": ["…"],
 *         "seo": { "title": "…", "description": "…" }, "cover": "texte alternatif", "moodboard": ["légende", "…"]
 *       }
 *     }
 *   }
 *
 * Chaque champ est facultatif : un champ absent ou vide garde le texte français. Seuls les textes
 * sont traduits ; prix, tailles, délais, photos et identifiants ne changent jamais. Avec Shopify,
 * les traductions de la boutique (application Translate & Adapt, ACTIVATION.md) pourront remplacer
 * ce document.
 *
 * Module pur : aucune lecture ici (lib/commerce/index.ts charge le document).
 */
import type { Collection, Image, Product } from "@/lib/commerce/types";

export const CATALOGUE_TRANSLATIONS_DOC = "catalogue-pieces";

interface SeoTranslation {
  title?: string;
  description?: string;
}

export interface PieceTranslation {
  title?: string;
  tagline?: string;
  description?: string[];
  details?: string[];
  fit?: string;
  care?: string[];
  model?: string;
  seo?: SeoTranslation;
  /** textes alternatifs des photos, dans l'ordre des photos de la pièce */
  images?: string[];
  detailImage?: string;
  video?: string;
}

export interface CollectionTranslation {
  title?: string;
  season?: string;
  lead?: string;
  intention?: string[];
  seo?: SeoTranslation;
  /** texte alternatif de la photo de couverture */
  cover?: string;
  /** légendes du moodboard, dans l'ordre */
  moodboard?: string[];
}

export interface CatalogueTranslations {
  pieces?: Record<string, PieceTranslation | undefined>;
  collections?: Record<string, CollectionTranslation | undefined>;
}

const text = (value: unknown, fallback: string): string => (typeof value === "string" && value.trim() ? value : fallback);
const texts = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value) && value.length && value.every((v) => typeof v === "string") && value.some((v) => v.trim()) ? value : fallback;
const seo = (t: SeoTranslation | undefined, base: { title: string; description: string }) => ({ title: text(t?.title, base.title), description: text(t?.description, base.description) });
const alt = <I extends Pick<Image, "alt">>(image: I, value: unknown): I => (typeof value === "string" && value.trim() ? { ...image, alt: value } : image);

/** Fiche d'une pièce dans la langue de sa traduction ; sans traduction, la fiche telle quelle. */
export function translatePiece(p: Product, t: PieceTranslation | undefined): Product {
  if (!t || typeof t !== "object") return p;
  return {
    ...p,
    title: text(t.title, p.title),
    tagline: text(t.tagline, p.tagline),
    description: texts(t.description, p.description),
    details: texts(t.details, p.details),
    fit: text(t.fit, p.fit),
    care: texts(t.care, p.care),
    model: text(t.model, p.model),
    seo: seo(t.seo, p.seo),
    images: p.images.map((image, i) => alt(image, t.images?.[i])),
    ...(p.detailImage ? { detailImage: alt(p.detailImage, t.detailImage) } : {}),
    ...(p.video ? { video: alt(p.video, t.video) } : {}),
  };
}

/** Collection dans la langue de sa traduction ; sans traduction, telle quelle. */
export function translateCollection(c: Collection, t: CollectionTranslation | undefined): Collection {
  if (!t || typeof t !== "object") return c;
  return {
    ...c,
    title: text(t.title, c.title),
    season: text(t.season, c.season),
    lead: text(t.lead, c.lead),
    intention: texts(t.intention, c.intention),
    seo: seo(t.seo, c.seo),
    cover: alt(c.cover, t.cover),
    moodboard: c.moodboard.map((m, i) => ({ ...m, caption: text(t.moodboard?.[i], m.caption) })),
  };
}

export function translatePieces(list: Product[], doc: CatalogueTranslations | null | undefined): Product[] {
  const pieces = doc?.pieces;
  return pieces && typeof pieces === "object" ? list.map((p) => translatePiece(p, pieces[p.handle])) : list;
}

export function translateCollections(list: Collection[], doc: CatalogueTranslations | null | undefined): Collection[] {
  const collections = doc?.collections;
  return collections && typeof collections === "object" ? list.map((c) => translateCollection(c, collections[c.handle])) : list;
}
