/**
 * Lecture des contenus par les pages.
 *
 * Site public : la version publiée, mise en cache et régénérée à chaque publication (étiquette
 * « contenu:<document> »). Mode Édition (Draft Mode de Next.js ET session de l'Atelier) : le
 * brouillon s'il existe, avec les marques invisibles qui rendent chaque texte cliquable. Sans
 * session de l'Atelier, même avec le cookie du Draft Mode, aucun brouillon n'est jamais rendu.
 *
 * Langue : par défaut celle de la requête (lib/i18n/server.ts : l'anglais sous /en, le français
 * partout ailleurs) ; une version anglaise absente ou incomplète retombe sur le français
 * (readDoc, lib/edition/store.ts). L'Atelier, les e-mails et les fichiers servis sans requête de
 * page (flux, llms.txt, plan du site) passent la langue explicitement.
 */
import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { unstable_cache } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { editionStorage, isLocale, type Locale } from "./config";
import { getLocale } from "@/lib/i18n/server";
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

export interface DocOptions {
  /** sans les marques du mode Édition */
  plain?: boolean;
}

/** Arguments de getDoc et findDoc : (doc, options), (doc, langue) ou (doc, langue, options). */
async function resolveArgs(locale: Locale | DocOptions | undefined, opts: DocOptions | undefined): Promise<{ locale: Locale; opts: DocOptions }> {
  if (typeof locale === "string" && isLocale(locale)) return { locale, opts: opts ?? {} };
  return { locale: await getLocale(), opts: (typeof locale === "object" ? locale : opts) ?? {} };
}

/**
 * Contenu d'un document pour une page, dans la langue de la requête (ou celle donnée). `plain` :
 * sans les marques du mode Édition, pour ce qui n'est pas affiché dans la page (métadonnées,
 * données structurées, e-mails, valeurs comparées).
 */
export async function getDoc<T>(doc: string, opts?: DocOptions): Promise<T>;
export async function getDoc<T>(doc: string, locale: Locale | undefined, opts?: DocOptions): Promise<T>;
export async function getDoc<T>(doc: string, localeOrOpts?: Locale | DocOptions, maybeOpts?: DocOptions): Promise<T> {
  const { locale, opts } = await resolveArgs(localeOrOpts, maybeOpts);
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
export async function findDoc<T>(doc: string, opts?: DocOptions): Promise<T | null>;
export async function findDoc<T>(doc: string, locale: Locale | undefined, opts?: DocOptions): Promise<T | null>;
export async function findDoc<T>(doc: string, localeOrOpts?: Locale | DocOptions, maybeOpts?: DocOptions): Promise<T | null> {
  const { locale, opts } = await resolveArgs(localeOrOpts, maybeOpts);
  if (await isEditing()) {
    const draft = await readDoc(doc, locale, { draft: true });
    if (draft === null || draft === undefined) return null;
    return (opts.plain ? draft : stegaEncodeDeep(draft, doc, locale)) as T;
  }
  const content = editionStorage() === "fichiers" ? await readDoc(doc, locale) : await publishedCached(doc, locale);
  return (content ?? null) as T | null;
}
