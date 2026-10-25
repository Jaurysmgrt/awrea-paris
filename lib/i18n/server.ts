/**
 * Langue de la requête en cours, côté serveur : celle que proxy.ts a posée dans l'en-tête interne
 * (« en » sous /en, « fr » partout ailleurs : Atelier, API, éditeur). Hors d'une requête
 * (compilation, script, tâche) : le français.
 */
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "@/lib/i18n/routing";

export const getLocale = cache(async (): Promise<Locale> => {
  let value: string | null = null;
  try {
    value = (await headers()).get(LOCALE_HEADER);
  } catch (e) {
    // rendu dynamique demandé par Next.js : on le laisse faire ; hors requête : français
    unstable_rethrow(e);
    return DEFAULT_LOCALE;
  }
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
});
