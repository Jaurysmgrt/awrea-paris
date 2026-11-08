/**
 * Catalogue de l'Atelier (refonte du 07/11, « Shopify simplifié ») : toutes les pièces, en ligne,
 * en brouillon ou archivées, et les gestes de la page Produits : changer les textes, mettre en
 * brouillon, publier, archiver, dupliquer. Shopify Admin quand il est branché, surcouches du
 * catalogue de démonstration sinon ; les deux pilotes donnent le même résultat à l'écran.
 *
 * Le site public ne voit jamais une pièce en brouillon ou archivée : la Storefront API de Shopify ne
 * les renvoie pas, et le catalogue de démonstration les écarte (lib/commerce/catalog-demo.ts).
 */
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { kv } from "@/lib/store";
import { adminEnabled, shopifyAtelierPiece, shopifyAtelierPieces, shopifyDuplicate, shopifySetStatus, shopifyUpdateTexts, type AdminPiece } from "@/lib/shopify/admin";
import { paragraphsOf } from "@/lib/shopify/html";
import { DEFAULT_LEAD_TIME, normalizeLeadTime } from "./availability";
import { DEMO_KEYS, demoProducts } from "./catalog-demo";
import { adresseDeCopie, depuisShopify, descriptionHtml, LIBELLE_STATUT, nomDeCopie, VERS_SHOPIFY, type StatutPiece } from "./statut-pieces";
import type { Category, Image, LeadTime, Product, Size } from "./types";

export type { StatutPiece };

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

export class CatalogueError extends Error {}

const CATEGORIES: Record<string, Category> = { robe: "robe", robes: "robe", body: "body", bodys: "body", top: "top", tops: "top", jupe: "jupe", jupes: "jupe", accessoire: "accessoire", accessoires: "accessoire" };
const cents = (amount: string) => Math.round(parseFloat(amount) * 100);
const vrai = (v?: { value: string } | null) => v?.value === "true";
const entier = (v?: { value: string } | null) => (v?.value ? parseInt(v.value, 10) : null);

function depuisDemo(p: Product & { statut: StatutPiece }): PieceAtelier {
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
    statut: p.statut,
  };
}

function depuisAdmin(p: AdminPiece): PieceAtelier {
  const category = CATEGORIES[p.productType.toLowerCase()] ?? "robe";
  const prix = p.variants.nodes.map((v) => cents(v.price));
  const manquant = !p.leadMin?.value && !p.leadMax?.value;
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
    leadTimeProvisional: manquant || vrai(p.leadProvisional),
    isNew: vrai(p.isNew) || p.tags.some((t) => t.toLowerCase() === "nouveau"),
    sizes: p.variants.nodes.map((v) => (v.selectedOptions.find((o) => /taille|size/i.test(o.name))?.value ?? "TU") as Size),
    images,
    description: texte,
    seo: { title: p.seo.title ?? `${p.title} | Awrea Paris`, description: p.seo.description ?? (texte[0] ?? "").slice(0, 155) },
    statut: depuisShopify(p.status),
  };
}

/** Toutes les pièces, en ligne d'abord puis brouillons et archives, chacune par ordre alphabétique. */
export async function listerPieces(): Promise<PieceAtelier[]> {
  const pieces = adminEnabled ? (await shopifyAtelierPieces()).map(depuisAdmin) : (await demoProducts({ tous: true })).map(depuisDemo);
  const ordre: Record<StatutPiece, number> = { "en-ligne": 0, brouillon: 1, archivee: 2 };
  return pieces.sort((a, b) => ordre[a.statut] - ordre[b.statut] || a.title.localeCompare(b.title, "fr"));
}

export async function lirePiece(handle: string): Promise<PieceAtelier | null> {
  if (adminEnabled) {
    const p = await shopifyAtelierPiece(handle);
    return p ? depuisAdmin(p) : null;
  }
  return (await listerPieces()).find((p) => p.handle === handle) ?? null;
}

function rafraichir(handle?: string) {
  try {
    if (adminEnabled) revalidateTag("shopify", { expire: 0 });
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

/** Nom, accroche, description et référencement : seuls les textes qui changent sont écrits. */
export async function modifierTextes(handle: string, t: TextesPiece): Promise<{ title: string; summary: string }> {
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  const change: TextesPiece = {
    ...(t.title !== undefined && t.title.trim() && t.title.trim() !== p.title ? { title: t.title.trim() } : {}),
    ...(t.tagline !== undefined && t.tagline.trim() !== p.tagline ? { tagline: t.tagline.trim() } : {}),
    ...(t.description && JSON.stringify(t.description) !== JSON.stringify(p.description) ? { description: t.description } : {}),
    ...(t.seo && (t.seo.title !== p.seo.title || t.seo.description !== p.seo.description) ? { seo: t.seo } : {}),
  };
  if (!Object.keys(change).length) return { title: p.title, summary: `${p.title} : aucun changement` };
  if (adminEnabled) {
    await shopifyUpdateTexts(handle, { ...(change.title ? { title: change.title } : {}), ...(change.tagline !== undefined ? { tagline: change.tagline } : {}), ...(change.description ? { descriptionHtml: descriptionHtml(change.description) } : {}), ...(change.seo ? { seo: change.seo } : {}) });
  } else {
    const patches = (await kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches)) ?? {};
    await kv.set(DEMO_KEYS.patches, { ...patches, [handle]: { ...(patches[handle] ?? {}), ...change } });
  }
  rafraichir(handle);
  const quoi = [change.title && "nom", change.tagline !== undefined && "accroche", change.description && "description", change.seo && "référencement"].filter(Boolean).join(", ");
  return { title: change.title ?? p.title, summary: `${change.title ?? p.title} : ${quoi} mis à jour` };
}

/**
 * En ligne, brouillon ou archivée. Avec Shopify, une pièce remise en ligne est publiée sur les
 * canaux de vente où elle manque ; sans la permission des publications, la phrase le dit.
 */
export async function changerStatut(handle: string, statut: StatutPiece): Promise<{ title: string; summary: string; canaux: boolean }> {
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  if (p.statut === statut) return { title: p.title, summary: `${p.title} est déjà ${LIBELLE_STATUT[statut].toLowerCase()}`, canaux: true };
  if (statut === "en-ligne" && !p.sizes.length) throw new CatalogueError("Cette pièce n’a aucune taille : elle ne peut pas être mise en ligne.");
  let canaux = true;
  if (adminEnabled) ({ canaux } = await shopifySetStatus(handle, VERS_SHOPIFY[statut]));
  else {
    const statuts = (await kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut)) ?? {};
    const { [handle]: _ancien, ...autres } = statuts;
    void _ancien;
    await kv.set(DEMO_KEYS.statut, statut === "en-ligne" ? autres : { ...autres, [handle]: statut });
  }
  rafraichir(handle);
  const phrase = statut === "en-ligne" ? "remise en ligne" : statut === "brouillon" ? "passée en brouillon, elle n’est plus visible sur le site" : "archivée, elle n’est plus visible sur le site";
  return { title: p.title, summary: `${p.title} : ${phrase}${canaux ? "" : ". Shopify n’a pas permis de la publier sur les canaux de vente : vérifiez-le dans Shopify"}`, canaux };
}

/** Copie en brouillon, avec ses photos et ses textes, sous une nouvelle adresse. */
export async function dupliquerPiece(handle: string): Promise<{ handle: string; title: string }> {
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  const title = nomDeCopie(p.title);
  if (adminEnabled) {
    const r = await shopifyDuplicate(handle, title);
    rafraichir();
    return { handle: r.handle, title };
  }
  const [toutes, extra, statuts] = await Promise.all([demoProducts({ tous: true }), kv.get<Product[]>(DEMO_KEYS.extra), kv.get<Record<string, StatutPiece>>(DEMO_KEYS.statut)]);
  const source = toutes.find((x) => x.handle === handle)!;
  const nouvelle = adresseDeCopie(handle, toutes.map((x) => x.handle));
  const { statut: _s, ...produit } = source;
  void _s;
  const copie: Product = {
    ...produit,
    id: `copie-${nouvelle}`,
    handle: nouvelle,
    title,
    variants: produit.variants.map((v) => ({ ...v, id: `${nouvelle}-${v.size.toLowerCase()}` })),
    isNew: false,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
  await kv.set(DEMO_KEYS.extra, [...(extra ?? []), copie]);
  await kv.set(DEMO_KEYS.statut, { ...(statuts ?? {}), [nouvelle]: "brouillon" });
  rafraichir();
  return { handle: nouvelle, title };
}
