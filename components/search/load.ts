"use client";
import type { SearchEntry } from "@/lib/search/match";
import { DEFAULT_LOCALE, splitLocale, type Locale } from "@/lib/i18n/routing";

const pending = new Map<Locale, Promise<SearchEntry[]>>();

/**
 * Charge l'index une seule fois (dès le survol du bouton « Rechercher », pour un affichage
 * immédiat), dans la langue de la page : /api/search en français, /api/search/en sous /en.
 */
export function loadSearchIndex(): Promise<SearchEntry[]> {
  const { locale } = splitLocale(window.location.pathname);
  let p = pending.get(locale);
  if (!p) {
    p = fetch(locale === DEFAULT_LOCALE ? "/api/search" : `/api/search/${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { entries: SearchEntry[] }) => j.entries)
      .catch((e) => {
        pending.delete(locale);
        throw e;
      });
    pending.set(locale, p);
  }
  return p;
}
