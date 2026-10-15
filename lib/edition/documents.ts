/**
 * Registre des documents modifiables : pages du site, textes de l'interface, e-mails, pages légales,
 * et pages créées depuis un modèle (événement, article du Journal, collection).
 *
 * Les documents du dépôt sont décrits dans content/site/documents.json ; les pages créées dans
 * l'éditeur s'y ajoutent dans le stockage technique (et dans leur propre fichier à la publication).
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { kv } from "@/lib/store";
import { contentDir, isDocId, publishedDoc } from "./store";

export type DocKind = "page" | "textes" | "email" | "legal" | "modele";
export type Modele = "evenement" | "article" | "collection";

export interface DocInfo {
  id: string;
  label: string;
  kind: DocKind;
  /** adresse où le document s'affiche (pour l'ouvrir en mode Édition) */
  chemin?: string;
  /** structure faite de blocs (sections ajoutables, déplaçables) */
  blocs?: string;
  modele?: Modele;
  createdAt?: string;
  createdBy?: string;
}

const CUSTOM_KEY = "edition:documents";

export const MODELES: Record<Modele, { label: string; prefixe: string; description: string }> = {
  evenement: { label: "Page d’événement", prefixe: "/evenements/", description: "Un pop-up, une présentation, un essayage collectif : la date, le lieu, les photographies." },
  article: { label: "Article du Journal", prefixe: "/journal/", description: "Une histoire de l’atelier, des coulisses, une matière : un texte et ses images." },
  collection: { label: "Collection", prefixe: "/collections/", description: "La page éditoriale d’une collection : son histoire, ses images, ses pièces." },
};

/** Registre du dépôt : documents.json, et un fichier par équipe dans registre/ (aucun conflit d'écriture). */
async function repoDocuments(): Promise<DocInfo[]> {
  const read = async (file: string) => {
    try {
      const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, Omit<DocInfo, "id">>;
      return Object.entries(raw).map(([id, d]) => ({ id, ...d }));
    } catch {
      return [];
    }
  };
  const dir = path.join(contentDir(), "registre");
  const parts = await fs.readdir(dir).catch(() => [] as string[]);
  const all = [await read(path.join(contentDir(), "documents.json")), ...(await Promise.all(parts.filter((f) => f.endsWith(".json")).sort().map((f) => read(path.join(dir, f)))))];
  return all.flat();
}

export async function listDocuments(): Promise<DocInfo[]> {
  const [repo, custom] = await Promise.all([repoDocuments(), kv.get<DocInfo[]>(CUSTOM_KEY).catch(() => null)]);
  const all = [...repo];
  for (const d of custom ?? []) if (!all.some((x) => x.id === d.id)) all.push(d);
  return all;
}

export async function documentInfo(id: string): Promise<DocInfo | null> {
  return (await listDocuments()).find((d) => d.id === id) ?? null;
}

/** Documents affichés à une adresse (pour l'éditeur et l'aperçu). */
export async function documentsAt(chemin: string): Promise<DocInfo[]> {
  return (await listDocuments()).filter((d) => d.chemin === chemin);
}

export const slugOf = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Nouvelle page à partir d'un modèle : un brouillon, invisible du public jusqu'à sa publication. */
export async function registerPage(modele: Modele, titre: string, slug: string, by: string): Promise<DocInfo> {
  const s = slugOf(slug || titre);
  const id = `${modele}-${s}`;
  if (!s || !isDocId(id)) throw new Error("Cette adresse n’est pas possible. Choisissez des lettres et des chiffres.");
  if (await documentInfo(id)) throw new Error("Une page porte déjà cette adresse.");
  const info: DocInfo = { id, label: titre.trim(), kind: "modele", modele, chemin: `${MODELES[modele].prefixe}${s}`, blocs: "sections", createdAt: new Date().toISOString(), createdBy: by };
  const custom = (await kv.get<DocInfo[]>(CUSTOM_KEY).catch(() => null)) ?? [];
  await kv.set(CUSTOM_KEY, [...custom, info]);
  return info;
}

export async function unregisterPage(id: string) {
  const custom = (await kv.get<DocInfo[]>(CUSTOM_KEY).catch(() => null)) ?? [];
  await kv.set(CUSTOM_KEY, custom.filter((d) => d.id !== id));
}

/** Pages créées depuis un modèle et publiées (plan du site, recherche). */
export async function publishedModelePages(): Promise<DocInfo[]> {
  const custom = (await listDocuments()).filter((d) => d.kind === "modele" && d.chemin);
  const live = await Promise.all(custom.map(async (d) => ((await publishedDoc(d.id, "fr").catch(() => null)) ? d : null)));
  return live.filter((d): d is DocInfo => d !== null);
}
