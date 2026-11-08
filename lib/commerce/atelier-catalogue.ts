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
import { adminEnabled, shopifyAddPhotos, shopifyAtelierPiece, shopifyAtelierPieces, shopifyDuplicate, shopifyMainPhoto, shopifyPhotoAlt, shopifyRemovePhoto, shopifySetStatus, shopifyUpdateTexts, type AdminPiece, type AdminPieceResume } from "@/lib/shopify/admin";
import { identity } from "@/content/brand/identity";
import type { StoredMedia } from "@/lib/agents/team/catalogue";
import { paragraphsOf } from "@/lib/shopify/html";
import { DEFAULT_LEAD_TIME, normalizeLeadTime } from "./availability";
import { DEMO_KEYS, demoHandlesPris, demoProducts } from "./catalog-demo";
import { commerceMode, getAllProducts } from "./index";
import { adresseDeCopie, depuisShopify, descriptionHtml, LIBELLE_STATUT, nomDeCopie, PHOTOS_MAX, realignerParCle, VERS_SHOPIFY, type StatutPiece } from "./statut-pieces";
import { CATALOGUE_TRANSLATIONS_DOC, type CatalogueTranslations } from "./translations";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/edition/config";
import { draftOf, publishContent, publishedDoc, saveDraftContent } from "@/lib/edition/store";
import type { Category, Image, LeadTime, Product, Size } from "./types";

export type { StatutPiece };

/** Photo d'une pièce et sa clé : l'identifiant du média dans Shopify, l'adresse de la photo sinon. */
export type PhotoPiece = Image & { cle: string };

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
  images: PhotoPiece[];
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
    images: p.images.map((im) => ({ ...im, cle: im.src })),
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
  const images: PhotoPiece[] = p.media.nodes.flatMap((m) => ("image" in m && m.image && m.id ? [{ cle: m.id, src: m.image.url, alt: m.alt ?? p.title, width: m.image.width, height: m.image.height, ...(provisoire ? { provisoire: true } : {}) }] : []));
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
    await shopifyUpdateTexts(r.handle, { seo: { title: titreGoogle(title), description: p.seo.description } }).catch((e) => console.warn("Copie : titre Google non mis à jour", e));
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

export { PHOTOS_MAX };

/**
 * Les textes alternatifs traduits (document « catalogue-pieces », rangés par position) suivent
 * leurs photos quand l'ordre change : sans cela, la version anglaise décrirait une photo par le
 * texte d'une autre. La version publiée et le brouillon éventuel sont réalignés ensemble.
 */
async function realignerTextesTraduits(handle: string, avant: string[], apres: string[], titre: string) {
  for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
    const realigner = (doc: unknown): CatalogueTranslations | null => {
      const d = doc as CatalogueTranslations | null;
      const t = d?.pieces?.[handle];
      if (!d || !t?.images?.length) return null;
      return { ...d, pieces: { ...d.pieces, [handle]: { ...t, images: realignerParCle(avant, apres, t.images) } } };
    };
    const publie = realigner(await publishedDoc(CATALOGUE_TRANSLATIONS_DOC, locale));
    if (publie) await publishContent(CATALOGUE_TRANSLATIONS_DOC, locale, publie, "atelier", `Photos de ${titre} : textes traduits remis en face de leurs photos`);
    const brouillon = await draftOf(CATALOGUE_TRANSLATIONS_DOC, locale);
    const brouillonRealigne = brouillon ? realigner(brouillon.content) : null;
    if (brouillonRealigne) await saveDraftContent(CATALOGUE_TRANSLATIONS_DOC, locale, brouillonRealigne, "atelier");
  }
}

export type ChangementPhotos =
  | { action: "ajouter"; mediaIds: string[] }
  | { action: "retirer"; cle: string }
  | { action: "principale"; cle: string }
  | { action: "texte"; cle: string; alt: string };

/**
 * Photos d'une pièce : en ajouter (déposées dans l'Atelier), en retirer, choisir la principale (la
 * première, celle des listes), écrire le texte alternatif lu aux personnes aveugles. Une pièce
 * garde toujours au moins une photo, 8 au plus. Avec Shopify, l'ajout et le nouvel ordre sont
 * appliqués par Shopify en quelques secondes : la phrase le dit.
 */
export async function changerPhotos(handle: string, c: ChangementPhotos): Promise<{ title: string; summary: string }> {
  exigerModifiable();
  const p = await lirePiece(handle);
  if (!p) throw new CatalogueError("Cette pièce n’existe pas.");
  const mediaIds = c.action === "ajouter" ? [...new Set(c.mediaIds)] : [];
  const i = c.action === "ajouter" ? -1 : p.images.findIndex((im) => im.cle === c.cle);
  if (c.action !== "ajouter" && i < 0) throw new CatalogueError("Cette photo n’est plus sur la pièce : rechargez la page.");
  if (c.action === "retirer" && p.images.length <= 1) throw new CatalogueError("Une pièce garde au moins une photo : ajoutez-en une autre avant de retirer celle-ci.");
  if (c.action === "ajouter" && p.images.length + mediaIds.length > PHOTOS_MAX) throw new CatalogueError(`${PHOTOS_MAX} photos au plus par pièce : retirez-en une avant d’en ajouter.`);
  if (c.action === "principale" && i === 0) return { title: p.title, summary: `${p.title} : c’est déjà la photo principale` };

  let nouvelles: Image[] = [];
  if (c.action === "ajouter") {
    const medias = await Promise.all(mediaIds.map((id) => kv.get<StoredMedia>(`media:${id}`)));
    if (medias.some((m) => !m)) throw new CatalogueError("Une photo n’a pas été retrouvée : déposez-la de nouveau.");
    nouvelles = (medias as StoredMedia[]).map((m, k) => ({ src: `/api/media/${m.id}`, alt: `${p.title}, photographie ${p.images.length + k + 1}`, width: m.width, height: m.height }));
  }
  // ordre des photos avant et après, par clé : les textes traduits suivent leurs photos
  const avant = p.images.map((im) => im.cle);
  const apres = c.action === "retirer" ? avant.filter((k) => k !== c.cle) : c.action === "principale" ? [c.cle, ...avant.filter((k) => k !== c.cle)] : avant;

  if (adminEnabled) {
    if (c.action === "ajouter") await shopifyAddPhotos(handle, nouvelles.map((n) => ({ url: `${identity.url}${n.src}`, alt: n.alt })));
    else if (c.action === "retirer") await shopifyRemovePhoto(handle, c.cle);
    else if (c.action === "principale") await shopifyMainPhoto(handle, c.cle);
    else await shopifyPhotoAlt(c.cle, c.alt);
  } else {
    const images: Image[] = p.images.map(({ cle: _cle, ...im }) => im);
    const suivantes =
      c.action === "ajouter"
        ? [...images, ...nouvelles]
        : c.action === "retirer"
          ? images.filter((_, k) => k !== i)
          : c.action === "principale"
            ? [images[i], ...images.filter((_, k) => k !== i)]
            : images.map((im, k) => (k === i ? { ...im, alt: c.alt } : im));
    // la photo de détail (volet loupe de la fiche) ne montre jamais une photo retirée
    const source = (await demoProducts({ tous: true })).find((x) => x.handle === handle);
    const detail = source?.detailImage && !suivantes.some((im) => im.src === source.detailImage!.src) ? { detailImage: suivantes[suivantes.length - 1] } : {};
    const patches = (await kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches)) ?? {};
    await kv.set(DEMO_KEYS.patches, { ...patches, [handle]: { ...(patches[handle] ?? {}), images: suivantes, ...detail } });
  }
  let traductions = true;
  if (apres !== avant)
    await realignerTextesTraduits(handle, avant, apres, p.title).catch((e) => {
      traductions = false;
      console.error("[atelier/photos] textes traduits", e);
    });
  rafraichirCatalogue(handle);
  const n = mediaIds.length;
  const shopify = adminEnabled ? "Shopify l’applique, la fiche se met à jour dans un instant" : "";
  const summary =
    c.action === "ajouter"
      ? `${p.title} : ${n} photo${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}${shopify ? ` ; ${shopify}` : ""}`
      : c.action === "retirer"
        ? `${p.title} : photo retirée`
        : c.action === "principale"
          ? `${p.title} : nouvelle photo principale${shopify ? ` ; ${shopify}` : ""}`
          : `${p.title} : texte de la photo enregistré`;
  return { title: p.title, summary: traductions ? summary : `${summary}. Les textes anglais des photos sont à relire dans l’Édition.` };
}
