/**
 * Lecture des contenus par les pages.
 *
 * Site public : la version publiée, mise en cache et régénérée à chaque publication (étiquette
 * « contenu:<document> »). Mode Édition (Draft Mode de Next.js ET session de l'Atelier) : le
 * brouillon s'il existe, avec les marques invisibles qui rendent chaque texte cliquable. Sans
 * session de l'Atelier, même avec le cookie du Draft Mode, aucun brouillon n'est jamais rendu.
 */
import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { DEFAULT_LOCALE, editionStorage, type Locale } from "./config";
import { readDoc } from "./store";
import { stegaEncodeDeep } from "./stega";

/** Vrai seulement pour la créatrice connectée, en mode Édition. */
export const isEditing = cache(async (): Promise<boolean> => {
  try {
    if (!(await draftMode()).isEnabled) return false;
  } catch {
    return false; // hors d'une requête (compilation, script)
  }
  return isAdmin();
});

const publishedCached = (doc: string, locale: Locale) =>
  unstable_cache(async () => readDoc(doc, locale), ["edition", doc, locale], { tags: ["contenu", `contenu:${doc}`] })();

/**
 * Contenu d'un document pour une page. `plain` : sans les marques du mode Édition, pour ce qui
 * n'est pas affiché dans la page (métadonnées, données structurées, e-mails, valeurs comparées).
 */
export async function getDoc<T>(doc: string, locale: Locale = DEFAULT_LOCALE, opts: { plain?: boolean } = {}): Promise<T> {
  if (await isEditing()) {
    const draft = (await readDoc(doc, locale, { draft: true })) ?? {};
    return (opts.plain ? draft : stegaEncodeDeep(draft, doc, locale)) as T;
  }
  // en local, les fichiers du dépôt sont relus dès qu'ils changent ; en ligne, cache régénéré à la publication
  const content = editionStorage() === "fichiers" ? await readDoc(doc, locale) : await publishedCached(doc, locale);
  if (content === null || content === undefined) throw new Error(`Contenu introuvable : content/site/${locale}/${doc}.json`);
  return content as T;
}

/** Comme getDoc, mais null si le document n'existe pas (page créée depuis un modèle, pas encore publiée). */
export async function findDoc<T>(doc: string, locale: Locale = DEFAULT_LOCALE, opts: { plain?: boolean } = {}): Promise<T | null> {
  if (await isEditing()) {
    const draft = await readDoc(doc, locale, { draft: true });
    if (draft === null || draft === undefined) return null;
    return (opts.plain ? draft : stegaEncodeDeep(draft, doc, locale)) as T;
  }
  const content = editionStorage() === "fichiers" ? await readDoc(doc, locale) : await publishedCached(doc, locale);
  return (content ?? null) as T | null;
}
