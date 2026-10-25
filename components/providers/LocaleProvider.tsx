"use client";
/**
 * Langue de la page pour les composants du navigateur (liens, prix, dates, sélecteur de langue).
 * Posée par le gabarit racine (app/layout.tsx) d'après getLocale() : la même valeur au rendu
 * serveur et à l'hydratation. Changer de langue recharge la page (components/layout/LanguageSwitch.tsx).
 */
import { createContext, useCallback, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n/routing";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = (): Locale => useContext(LocaleContext);

/**
 * Adresse interne dans la langue de la page, pour router.push, router.replace et les attributs
 * action des formulaires : « /recherche?q=dentelle » → « /en/recherche?q=dentelle » sous /en.
 */
export function useLocalize(): (href: string) => string {
  const locale = useLocale();
  return useCallback((href: string) => localizePath(href, locale), [locale]);
}
