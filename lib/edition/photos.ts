/**
 * Photos du site, pour la médiathèque de l'Atelier (Pages › Photos) et le filtre « Photos
 * provisoires à remplacer » de l'éditeur : celles des documents de contenu (brouillon compris, dans
 * chaque langue) et celles du catalogue (pièces et collections), chacune avec la page où elle paraît.
 *
 * Les photos des documents se remplacent sur la page, en mode Édition ; celles des pièces et des
 * collections viennent du catalogue (Shopify, métachamp `awrea.visuels_provisoires`).
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { LOCALES, type Locale } from "./config";
import { listDocuments, type DocInfo } from "./documents";
import { contentDir, draftOf, isDocId, publishedDoc } from "./store";
import { imagesIn, provisionalIn, type EtatProvisoire } from "./provisoires";
import { mediaLibrary, type MediaEntry } from "./medias";
import type { Img } from "./blocks";

export type Origine = "contenu" | "piece" | "collection";

export interface SitePhoto {
  /** clé stable : origine, document ou fiche, langue, chemin */
  id: string;
  origine: Origine;
  image: Img;
  /** page, pièce ou collection */
  label: string;
  /** adresse où la photo paraît */
  chemin?: string;
  /** photo d'un document de contenu : où la retrouver dans l'éditeur */
  doc?: string;
  locale?: Locale;
  path?: string;
  provisoire: boolean;
  etat?: EtatProvisoire;
}

/** Documents du dépôt (fichiers de content/site/<langue>/) et pages créées dans l'éditeur. */
async function allDocuments(): Promise<DocInfo[]> {
  const known = await listDocuments();
  const files = (await Promise.all(LOCALES.map((l) => fs.readdir(path.join(contentDir(), l)).catch(() => [] as string[])))).flat();
  const ids = [...new Set(files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)))].filter(isDocId);
  const extra = ids.filter((id) => !known.some((d) => d.id === id)).map((id): DocInfo => ({ id, label: id, kind: "textes" }));
  return [...known, ...extra];
}

async function contentPhotos(): Promise<SitePhoto[]> {
  const docs = await allDocuments();
  const perDoc = await Promise.all(
    docs.flatMap((d) =>
      LOCALES.map(async (locale) => {
        const [published, draft] = await Promise.all([publishedDoc(d.id, locale).catch(() => null), draftOf(d.id, locale)]);
        const current = draft?.content ?? published;
        if (current === null || current === undefined) return [];
        const photos: SitePhoto[] = imagesIn(current)
          .filter((f) => f.image.src)
          .map((f) => ({
            id: `contenu:${d.id}:${locale}:${f.path}`,
            origine: "contenu",
            image: f.image,
            label: d.label,
            chemin: d.chemin,
            doc: d.id,
            locale,
            path: f.path,
            provisoire: f.image.provisoire === true,
            ...(f.image.provisoire === true ? { etat: "a-remplacer" as const } : {}),
          }));
        // encore provisoires en ligne, déjà remplacées dans le brouillon
        for (const p of provisionalIn(published, draft?.content).filter((x) => x.etat === "a-publier"))
          photos.push({ id: `contenu:${d.id}:${locale}:${p.path}:en-ligne`, origine: "contenu", image: p.image, label: d.label, chemin: d.chemin, doc: d.id, locale, path: p.path, provisoire: true, etat: "a-publier" });
        return photos;
      }),
    ),
  );
  return perDoc.flat();
}

async function cataloguePhotos(): Promise<SitePhoto[]> {
  const [products, collections] = await Promise.all([getAllProducts().catch(() => []), getCollections().catch(() => [])]);
  const out: SitePhoto[] = [];
  for (const p of products) {
    [...p.images, ...(p.detailImage ? [p.detailImage] : [])].forEach((image, i) => {
      out.push({ id: `piece:${p.handle}:${i}`, origine: "piece", image, label: p.title, chemin: `/boutique/${p.handle}`, provisoire: image.provisoire === true, ...(image.provisoire ? { etat: "a-remplacer" as const } : {}) });
    });
  }
  for (const c of collections) {
    [c.cover, ...c.moodboard.map((m) => m.image)].forEach((image, i) => {
      out.push({ id: `collection:${c.handle}:${i}`, origine: "collection", image, label: c.title, chemin: `/collections/${c.handle}`, provisoire: image.provisoire === true, ...(image.provisoire ? { etat: "a-remplacer" as const } : {}) });
    });
  }
  return out;
}

/** Toutes les photos du site, les provisoires en tête (celles des pages d'abord, puis du catalogue). */
export async function sitePhotos(): Promise<SitePhoto[]> {
  const [content, catalogue] = await Promise.all([contentPhotos(), cataloguePhotos()]);
  const all = [...content, ...catalogue];
  const rank = (p: SitePhoto) => (p.etat === "a-remplacer" ? 0 : p.etat === "a-publier" ? 1 : 2);
  return all.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

/** Filtre « Photos provisoires à remplacer » : à remplacer, ou remplacées mais pas encore publiées. */
export async function provisionalPhotos(): Promise<SitePhoto[]> {
  return (await sitePhotos()).filter((p) => p.etat !== undefined);
}

export interface DepositedPhoto extends MediaEntry {
  /** pages où la photo paraît (brouillons compris) */
  pages: { label: string; chemin?: string }[];
}

/** Photos déposées dans l'éditeur, avec les pages où elles paraissent. */
export async function depositedPhotos(photos?: SitePhoto[]): Promise<DepositedPhoto[]> {
  const [library, used] = await Promise.all([mediaLibrary(), photos ? Promise.resolve(photos) : sitePhotos()]);
  return library.map((m) => {
    const pages = used.filter((p) => p.image.src === m.src && p.etat !== "a-publier").map((p) => ({ label: p.label, chemin: p.chemin }));
    return { ...m, pages: pages.filter((p, i) => pages.findIndex((x) => x.label === p.label && x.chemin === p.chemin) === i) };
  });
}
