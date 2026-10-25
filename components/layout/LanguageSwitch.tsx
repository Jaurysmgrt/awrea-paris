"use client";
/**
 * Sélecteur de langue discret « FR · EN » (en-tête et menu du téléphone) : il mène à la même page
 * dans l'autre langue (« /boutique » ↔ « /en/boutique »), avec sa requête (recherche, filtres, lien
 * de suivi). La langue en cours n'est pas un lien (aria-current).
 *
 * Lien ordinaire, sans transition drapée (data-no-transition) : la page se recharge, et tout
 * l'en-tête, le pied de page et les textes des composants arrivent dans la nouvelle langue.
 * Libellés : document « navigation », clé « langues » (content/site/<langue>/navigation.json).
 */
import { Fragment, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { HREFLANG, HTML_LANG, LOCALES, switchLocale, type Locale } from "@/lib/i18n/routing";

export type LanguesTexts = { titre: string } & Record<Locale, { court: string; nom: string }>;

/** la requête et l'ancre de la page en cours suivent la visiteuse dans l'autre langue */
const keepQuery = (e: MouseEvent<HTMLAnchorElement>) => {
  e.currentTarget.search = window.location.search;
  e.currentTarget.hash = window.location.hash;
};

export function LanguageSwitch({ t, className }: { t: LanguesTexts; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <div className={["lang-switch", className].filter(Boolean).join(" ")} role="group" aria-label={t.titre}>
      {LOCALES.map((l, i) => {
        const label = t[l];
        if (!label) return null;
        return (
          <Fragment key={l}>
            {i ? (
              <span className="lang-switch__sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            {l === locale ? (
              <span className="lang-switch__item" lang={HTML_LANG[l]} aria-current="true" aria-label={label.nom}>
                {label.court}
              </span>
            ) : (
              <a href={switchLocale(pathname, l)} hrefLang={HREFLANG[l]} lang={HTML_LANG[l]} className="lang-switch__item link link--quiet" aria-label={label.nom} data-no-transition="" onClick={keepQuery}>
                {label.court}
              </a>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
