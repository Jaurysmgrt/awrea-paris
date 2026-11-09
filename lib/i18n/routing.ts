/**
 * Langues du site public : le français à la racine (langue par défaut), l'anglais sous /en, aux
 * mêmes chemins (/en/boutique, /en/boutique/body-aura, /en/la-maison…).
 *
 * proxy.ts réécrit /en/… vers la même page et transmet la langue dans l'en-tête interne
 * LOCALE_HEADER (toujours posé par le proxy : une valeur envoyée par le navigateur est écrasée).
 * Les composants serveur la lisent par getLocale() (lib/i18n/server.ts), ceux du navigateur par
 * useLocale() (components/providers/LocaleProvider.tsx). Le lien interne du site
 * (components/ui/Link.tsx) garde la visiteuse dans sa langue.
 *
 * L'Atelier, l'éditeur, l'API et les fichiers (images, flux, PDF) n'ont pas de version anglaise :
 * ils restent hors de /en (404 sous /en).
 *
 * Module pur : proxy, serveur, navigateur et tests unitaires.
 */
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/edition/config";

export { DEFAULT_LOCALE, LOCALES, isLocale };
export type { Locale };

/** En-tête interne de la requête, posé par proxy.ts : la langue de la page demandée. */
export const LOCALE_HEADER = "x-awrea-locale";

/**
 * Cookie de la langue retenue de la visiteuse (brief du 09/11) : la langue automatique de sa
 * première visite, puis celle qu'elle choisit en modifiant l'adresse (une page /en/…, ou /fr/…
 * pour le français). Une adresse française la ramène à cette langue (langueVoulue, proxy.ts).
 */
export const LOCALE_COOKIE = "awrea_langue";
/** Durée du cookie de langue : 13 mois, comme les autres préférences. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 395;

/**
 * Langue préférée d'après les réglages du navigateur (en-tête Accept-Language) : la première de
 * ses langues que le site propose ; l'anglais si aucune ne l'est (une visiteuse étrangère) ; null
 * sans préférence exprimée (robots d'indexation) : la page demandée est alors servie telle quelle.
 */
export function preferredLocale(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((t) => t.tag && t.tag !== "*" && Number.isFinite(t.q) && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  if (!tags.length) return null;
  for (const t of tags) {
    const base = t.tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

/**
 * Pays de France (métropole et outre-mer), servis en français quelle que soit la langue du
 * navigateur (brief de la créatrice du 09/11).
 */
const PAYS_FRANCE = new Set(["FR", "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF", "NC", "PF", "WF", "TF"]);
/**
 * Pays anglophones, servis en anglais. Le Canada n'y figure pas : son adresse IP ne dit pas si la
 * visiteuse est anglophone ou francophone, c'est donc son navigateur qui décide.
 */
const PAYS_ANGLOPHONES = new Set(["GB", "US", "IE", "AU", "NZ", "ZA", "SG", "MT", "GI", "IM", "JE", "GG", "BM", "KY", "JM", "BS", "BB", "TT"]);

/**
 * Langue choisie automatiquement à la première visite (brief du 09/11), sans demander la position :
 * le pays (géolocalisation approximative par l'adresse IP, en-tête x-vercel-ip-country) d'abord,
 * puis la langue du navigateur, puis l'anglais. Null sans aucun signal (ni pays ni langue annoncée :
 * un robot d'indexation), pour que la page demandée soit servie telle quelle.
 */
export function langueAuto(pays: string | null | undefined, acceptLanguage: string | null | undefined): Locale | null {
  const code = pays?.trim().toUpperCase();
  if (code && PAYS_FRANCE.has(code)) return "fr";
  if (code && PAYS_ANGLOPHONES.has(code)) return "en";
  const navigateur = preferredLocale(acceptLanguage);
  if (navigateur) return navigateur;
  return code ? "en" : null;
}

/**
 * Langue d'une adresse française ouverte par une visiteuse : la langue retenue (cookie), sinon la
 * langue automatique. Sans sélecteur, la langue reste ainsi la même d'une visite à l'autre, même en
 * revenant par l'adresse du site.
 */
export function langueVoulue(retenue: string | null | undefined, pays: string | null | undefined, acceptLanguage: string | null | undefined): Locale | null {
  return retenue && isLocale(retenue) ? retenue : langueAuto(pays, acceptLanguage);
}

/**
 * Le français choisi en modifiant l'adresse : « /fr/boutique » → « /boutique », « /fr » → « / ».
 * Le français vit à la racine ; /fr/… ne sert qu'à le choisir (puis à le retenir) sans sélecteur.
 * Null pour toute autre adresse ou pour un chemin sans version française publique.
 */
export function adresseFrancaise(pathname: string): string | null {
  if (pathname !== "/fr" && !pathname.startsWith("/fr/")) return null;
  const path = pathname.slice(3) || "/";
  return isLocalizable(path) && splitLocale(path).locale === DEFAULT_LOCALE ? path : null;
}

/** Robots d'indexation et d'aperçu : jamais redirigés, chaque version reste indexable. */
export const estRobot = (userAgent: string | null | undefined) => /bot|crawl|spider|slurp|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|pinterest|bingpreview|lighthouse|pagespeed/i.test(userAgent ?? "");

/** Attribut lang de <html>. */
export const HTML_LANG: Record<Locale, string> = { fr: "fr", en: "en" };
/** Étiquettes hreflang des versions de chaque page (alternates.languages, plan du site). */
export const HREFLANG: Record<Locale, string> = { fr: "fr-FR", en: "en" };
/** Formats des prix et des dates (Intl) : la devise reste l'euro dans les deux langues. */
export const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };
/** Langue des partages (Open Graph). */
export const OG_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_GB" };

const prefixOf = (locale: Locale) => (locale === DEFAULT_LOCALE ? "" : `/${locale}`);

/** Langue d'une adresse et son chemin sans préfixe : « /en/boutique » → en et « /boutique ». */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const prefix = prefixOf(locale);
    if (pathname === prefix) return { locale, path: "/" };
    if (pathname.startsWith(`${prefix}/`)) return { locale, path: pathname.slice(prefix.length) };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** Chemin sans préfixe de langue : « /en/boutique » → « /boutique », « /en » → « / ». */
export const stripLocale = (pathname: string): string => splitLocale(pathname).path;

/** Chemins qui n'existent qu'en un exemplaire : API, Atelier, fichiers et routes techniques. */
const UNTRANSLATED = /^\/(?:api|gestion|_next|media|brand|icons|fonts|feeds|prive-[^/]*)(?:\/|$)/;
/** Un fichier (llms.txt, sitemap.xml, une facture PDF…) : jamais de version anglaise. */
const FILE = /\.[a-z0-9]{2,5}$/i;

/** Vrai si le chemin (sans préfixe de langue) est une page publique qui existe dans chaque langue. */
export function isLocalizable(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (UNTRANSLATED.test(path)) return false;
  return !FILE.test(path);
}

/**
 * Adresse d'un chemin interne dans une langue : « /boutique?taille=S » → « /en/boutique?taille=S »,
 * « / » → « /en ». Laisse intacts les adresses externes, mailto:, tel:, les ancres et requêtes
 * seules, les chemins déjà préfixés et ceux qui n'ont pas de version anglaise.
 */
export function localizePath(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  const cut = href.search(/[?#]/);
  const path = cut < 0 ? href : href.slice(0, cut);
  const rest = cut < 0 ? "" : href.slice(cut);
  if (!path || !isLocalizable(path)) return href;
  if (splitLocale(path).locale !== DEFAULT_LOCALE) return href;
  return `${prefixOf(locale)}${path === "/" ? "" : path}${rest}`;
}

/** Même adresse dans une autre langue (hreflang, plan du site) : « /en/boutique » → « /boutique ». */
export function switchLocale(pathname: string, locale: Locale): string {
  const path = stripLocale(pathname);
  return locale === DEFAULT_LOCALE ? path : localizePath(path, locale);
}

/** Lien de next/link (chaîne ou objet d'adresse) dans une langue. */
export function localizeHref<H extends string | { pathname?: string | null }>(href: H, locale: Locale): H {
  if (locale === DEFAULT_LOCALE) return href;
  if (typeof href === "string") return localizePath(href, locale) as H;
  if (href && typeof href.pathname === "string") return { ...(href as object), pathname: localizePath(href.pathname, locale) } as H;
  return href;
}
