/**
 * Catalogue de l'Atelier (refonte du 07/11, « Shopify simplifié ») : toutes les pièces, en ligne,
 * en brouillon ou archivées, et les gestes de la page Produits : changer les textes, mettre en
 * brouillon, publier, archiver, dupliquer. Trois situations :
 * - Shopify avec son accès Admin : lecture de toutes les pièces et gestes dans Shopify ;
 * - Shopify sans accès Admin (Storefront seule) : les pièces en ligne, en lecture seule, et chaque
 *   geste explique ce qu'il manque (ACTIVATION.md) plutôt que d'écrire dans la démonstration ;
 * - démonstration : surcouches du catalogue local.
 *
 * Le site public ne voit jamais une pièce en brouillon ou archivée : la Storefront API de Shopify ne
 * les renvoie pas, et le catalogue de démonstration les écarte (lib/commerce/catalog-demo.ts).
 */
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { kv } from "@/lib/store";
import { adminEnabled, shopifyAtelierPiece, shopifyAtelierPieces, shopifyDuplicate, shopifySetStatus, shopifyUpdateTexts, type AdminPiece, type AdminPieceResume } from "@/lib/shopify/admin";
import { paragraphsOf } from "@/lib/shopify/html";
import { DEFAULT_LEAD_TIME, normalizeLeadTime } from "./availability";
import { DEMO_KEYS, demoHandlesPris, demoProducts } from "./catalog-demo";
import { commerceMode, getAllProducts } from "./index";
import { adresseDeCopie, depuisShopify, descriptionHtml, LIBELLE_STATUT, nomDeCopie, VERS_SHOPIFY, type StatutPiece } from "./statut-pieces";
import type { Category, Image, LeadTime, Product, Size } from "./types";

export type { StatutPiece };

/** Pièce complète, pour sa fiche dans l'Atelier. */
export interface PieceAtelier {
  handle: string;
  title: string;
  tagline: string;
  category: Category;
  collection: string;
  /** centimes ; le plus bas quand les tailles n'ont pas le même prix */
  price: number;
  priceVaries: boolean;
  priceProvisional: boolean;
  leadTime: LeadTime;
  leadTimeProvisional: boolean;
  isNew: boolean;
  sizes: Size[];
  images: Image[];
  description: string[];
  seo: { title: string; description: string };
  statut: StatutPiece;
}

/** Ligne de la liste Produits. */
export interface PieceResume {
  handle: string;
  title: string;
  image: Image | null;
  price: number;
  priceVaries: boolean;
  priceProvisional: boolean;
  leadTimeProvisional: boolean;
  nombreTailles: number;
  collection: string;
  statut: StatutPiece;
}

export class CatalogueError extends Error {}

/** Les gestes de l'Atelier écrivent-ils vraiment là où le site lit ? */
export const catalogueModifiable = () => adminEnabled || commerceMode !== "shopify";
export const MESSAGE_LECTURE_SEULE = "La boutique est reliée à Shopify sans son accès Admin : les pièces se modifient pour l’instant dans Shopify (ACTIVATION.md, accès Admin).";

function exigerModifiable() {
  if (!catalogueModifiable()) throw new CatalogueError(MESSAGE_LECTURE_SEULE);
}

const CATEGORIES: Record<string, Category> = { robe: "robe", robes: "robe", body: "body", bodys: "body", top: "top", tops: "top", jupe: "jupe", jupes: "jupe", accessoire: "accessoire", accessoires: "accessoire" };
const cents = (amount: string) => Math.round(parseFloat(amount) * 100);
const vrai = (v?: { value: string } | null) => v?.value === "true";
const entier = (v?: { value: string } | null) => (v?.value ? parseInt(v.value, 10) : null);
const titreGoogle = (title: string) => `${title} | Awrea Paris`;

function depuisProduit(p: Product, statut: StatutPiece): PieceAtelier {
  return {
    handle: p.handle,
    title: p.title,
    tagline: p.tagline,
    category: p.category,
    collection: p.collection,
    price: p.price,
    priceVaries: Boolean(p.priceVaries),
    priceProvisional: Boolean(p.priceProvisional),
    leadTime: p.leadTime,
    leadTimeProvisional: Boolean(p.leadTimeProvisional),
    isNew: Boolean(p.isNew),
    sizes: p.variants.map((v) => v.size),
    images: p.images,
    description: p.description,
    seo: p.seo,
    statut,
  };
}

const resumer = (p: PieceAtelier): PieceResume => ({
  handle: p.handle,
  title: p.title,
  image: p.images[0] ?? null,
  price: p.price,
  priceVaries: p.priceVaries,
  priceProvisional: p.priceProvisional,
  leadTimeProvisional: p.leadTimeProvisional,
  nombreTailles: p.sizes.length,
  collection: p.collection,
  statut: p.statut,
});

function depuisAdmin(p: AdminPiece): PieceAtelier {
  const category = CATEGORIES[p.productType.toLowerCase()] ?? "robe";
  const prix = p.variants.nodes.map((v) => cents(v.price));
  const provisoire = vrai(p.imagesProvisional);
  const images = p.media.nodes.flatMap((m) => ("image" in m && m.image ? [{ src: m.image.url, alt: m.alt ?? p.title, width: m.image.width, height: m.image.height, ...(provisoire ? { provisoire: true } : {}) }] : []));
  const texte = paragraphsOf(p.descriptionHtml);
  return {
    handle: p.handle,
    title: p.title,
    tagline: p.tagline?.value ?? "",
    category,
    collection: p.collections.nodes[0]?.handle ?? "",
    price: prix.length ? Math.min(...prix) : 0,
    priceVaries: new Set(prix).size > 1,
    priceProvisional: vrai(p.priceProvisional),
    leadTime: normalizeLeadTime(entier(p.leadMin), entier(p.leadMax), DEFAULT_LEAD_TIME[category]),
    leadTimeProvisional: (!p.leadMin?.value && !p.leadMax?.value) || vrai(p.leadProvisional),
    isNew: vrai(p.isNew) || p.tags.some((t) => t.toLowerCase() === "nouveau"),
    sizes: p.variants.nodes.map((v) => (v.selectedOptions.find((o) => /taille|size/i.test(o.name))?.value ?? "TU") as Size),
    images,
    description: texte,
    seo: { title: p.seo.title || titreGoogle(p.title), description: p.seo.description || (texte[0] ?? "").slice(0, 155) },
    statut: depuisShopify(p.status),
  };
}

function resumeAdmin(p: AdminPieceResume): PieceResume {
  const image = p.featuredMedia?.image;
  return {
    handle: p.handle,
    title: p.title,
    image: image ? { src: image.url, alt: p.featuredMedia?.alt ?? p.title, width: image.width, height: image.height } : null,
    price: cents(p.priceRangeV2.minVariantPrice.amount),
    priceVaries: cents(p.priceRangeV2.minVariantPrice.amount) !== cents(p.priceRangeV2.maxVariantPrice.amount),
    priceProvisional: vrai(p.priceProvisional),
    leadTimeProvisional: (!p.leadMin?.value && !p.leadMax?.value) || vrai(p.leadProvisional),
    nombreTailles: p.variantsCount?.count ?? 0,
    collection: p.collections.nodes[0]?.handle ?? "",
    statut: depuisShopify(p.status),
  };
}

const ORDRE: Record<StatutPiece, number> = { "en-ligne": 0, brouillon: 1, archivee: 2 };

/**
 * Toutes les pièces, en ligne d'abord puis brouillons et archives, chacune par ordre alphabétique.
 * `complet` : faux si Shopify en compte plus que la liste n'en lit ; `modifiable` : faux si les
 * gestes ne peuvent pas écrire là où le site lit (Shopify sans accès Admin).
 */
export async function listerPieces(): Promise<{ pieces: PieceResume[]; complet: boolean; modifiable: boolean }> {
  let pieces: PieceResume[];
  let complet = true;
  if (adminEnabled) {
    const r = await shopifyAtelierPieces();
    pieces = r.pieces.map(resumeAdmin);
    complet = r.complet;
  } else if (commerceMode === "shopify") pieces = (await getAllProducts()).map((p) => resumer(depuisProduit(p, "en-ligne")));
  else pieces = (await demoProducts({ tous: true })).map((p) => resumer(depuisProduit(p, p.statut)));
  pieces.sort((a, b) => ORDRE[a.statut] - ORDRE[b.statut] || a.title.localeCompare(b.title, "fr"));
  return { pieces, complet, modifiable: catalogueModifiable() };
}

export async function lirePiece(handle: string): Promise<PieceAtelier | null> {
  if (adminEnabled) {
    const p = await shopifyAtelierPiece(handle);
    return p ? depuisAdmin(p) : null;
  }
  if (commerceMode === "shopify") {
    const p = (await getAllProducts()).find((x) => x.handle === handle);
    return p ? depuisProduit(p, "en-ligne") : null;
  }
  const p = (await demoProducts({ tous: true })).find((x) => x.handle === handle);
  return p ? depuisProduit(p, p.statut) : null;
}

/** Pages du site, et caches Shopify des pièces et des collections (lib/shopify/storefront.ts). */
export function rafraichirCatalogue(handle?: string) {
  try {
    if (adminEnabled) for (const tag of ["shopify", "products", "collections"]) revalidateTag(tag, { expire: 0 });
    revalidatePath("/", "layout");
    if (handle) revalidatePath(`/boutique/${handle}`);
  } catch {
    /* hors contexte de requête (script, test) */
  }
}

export interface TextesPiece {
  title?: string;
  tagline?: string;
  description?: string[];
  seo?: { title: string; description: string };
}

/**
 * Nom, accroche, description et référencement : seuls les textes qui changent sont écrits. Une
 * pièce renommée garde un titre Google à son nouveau nom, si ce titre reprenait l'ancien.
 */
export async function modifierTextes(handle: string, t: TextesPiece): Promise<{ title: string; summary: string }> {
  exigerModifiable();
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  if (t.description && !t.description.length) throw new CatalogueError("La description ne peut pas être vide : la fiche de la pièce l’affiche sur le site.");
  const title = t.title?.trim();
  let seo = t.seo && (t.seo.title !== p.seo.title || t.seo.description !== p.seo.description) ? t.seo : undefined;
  if (title && title !== p.title && !seo && p.seo.title.includes(p.title)) seo = { title: p.seo.title.replace(p.title, title), description: p.seo.description };
  const change: TextesPiece = {
    ...(title && title !== p.title ? { title } : {}),
    ...(t.tagline !== undefined && t.tagline.trim() !== p.tagline ? { tagline: t.tagline.trim() } : {}),
    ...(t.description && JSON.stringify(t.description) !== JSON.stringify(p.description) ? { description: t.description } : {}),
    ...(seo ? { seo } : {}),
  };
  if (!Object.keys(change).length) return { title: p.title, summary: `${p.title} : aucun changement` };
  if (adminEnabled) {
    await shopifyUpdateTexts(handle, {
      ...(change.title ? { title: change.title } : {}),
      ...(change.tagline !== undefined ? { tagline: change.tagline } : {}),
      ...(change.description ? { descriptionHtml: descriptionHtml(change.description) } : {}),
      ...(change.seo ? { seo: change.seo } : {}),
    });
  } else {
    const patches = (await kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches)) ?? {};
    await kv.set(DEMO_KEYS.patches, { ...patches, [handle]: { ...(patches[handle] ?? {}), ...change } });
  }
  rafraichirCatalogue(handle);
  const quoi = [change.title && "nom", change.tagline !== undefined && "accroche", change.description && "description", change.seo && "référencement"].filter(Boolean).join(", ");
  return { title: change.title ?? p.title, summary: `${change.title ?? p.title} : ${quoi} mis à jour` };
}

/**
 * En ligne, brouillon ou archivée. Avec Shopify, une pièce remise en ligne est publiée sur le canal
 * de vente du site s'il lui manque ; si ce canal n'est pas trouvé, la phrase le dit.
 */
export async function changerStatut(handle: string, statut: StatutPiece): Promise<{ title: string; summary: string; canaux: boolean }> {
  exigerModifiable();
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  if (p.statut === statut) return { title: p.title, summary: `${p.title} est déjà ${LIBELLE_STATUT[statut].toLowerCase()}`, canaux: true };
  if (statut === "en-ligne" && !p.sizes.length) throw new CatalogueError("Cette pièce n’a aucune taille : elle ne peut pas être mise en ligne.");
  let canaux = true;
  if (adminEnabled) ({ canaux } = await shopifySetStatus(handle, VERS_SHOPIFY[statut]));
  else {
    const statuts = (await kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut)) ?? {};
    const autres = Object.fromEntries(Object.entries(statuts).filter(([h]) => h !== handle));
    await kv.set(DEMO_KEYS.statut, statut === "en-ligne" ? autres : { ...autres, [handle]: statut });
  }
  rafraichirCatalogue(handle);
  const phrase = statut === "en-ligne" ? "remise en ligne" : statut === "brouillon" ? "en brouillon, elle n’est pas visible sur le site" : "archivée, elle n’est pas visible sur le site";
  return { title: p.title, summary: `${p.title} : ${phrase}${canaux ? "" : ". Shopify n’a pas permis de la publier sur le canal du site : vérifiez-le dans Shopify, ou réglez SHOPIFY_PUBLICATION_ID (ACTIVATION.md)"}`, canaux };
}

/** Copie en brouillon, avec ses photos et ses textes, sous une nouvelle adresse et son propre titre Google. */
export async function dupliquerPiece(handle: string): Promise<{ handle: string; title: string }> {
  exigerModifiable();
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  const title = nomDeCopie(p.title);
  if (adminEnabled) {
    const r = await shopifyDuplicate(handle, title);
    // la copie existe déjà : un titre Google resté à l'ancien nom ne doit pas la faire passer pour un échec
    await shopifyUpdateTexts(r.handle, { seo: { title: titreGoogle(title), description: p.seo.description } }).catch((e) => console.warn("Copie : titre Google non mis à jour", e));
    rafraichirCatalogue();
    return { handle: r.handle, title };
  }
  const [toutes, prises, extra, statuts] = await Promise.all([demoProducts({ tous: true }), demoHandlesPris(), kv.get<Product[]>(DEMO_KEYS.extra), kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut)]);
  const source = toutes.find((x) => x.handle === handle)!;
  const nouvelle = adresseDeCopie(handle, prises);
  const { statut: _s, ...produit } = source;
  void _s;
  const copie: Product = {
    ...produit,
    id: `copie-${nouvelle}`,
    handle: nouvelle,
    title,
    seo: { title: titreGoogle(title), description: produit.seo.description },
    variants: produit.variants.map((v) => ({ ...v, id: `${nouvelle}-${v.size.toLowerCase()}` })),
    isNew: false,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
  // le statut d'abord : la copie n'est jamais un instant en ligne
  await kv.set(DEMO_KEYS.statut, { ...(statuts ?? {}), [nouvelle]: "brouillon" });
  await kv.set(DEMO_KEYS.extra, [...(extra ?? []), copie]);
  rafraichirCatalogue();
  return { handle: nouvelle, title };
}
