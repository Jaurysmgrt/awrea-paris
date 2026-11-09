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
 * Langue de l'appareil de la visiteuse (choix de la créatrice du 09/11 : « quand la personne tape
 * une adresse, le site se met dans la langue de son ordinateur ou de son téléphone »). Lue à chaque
 * page dans l'en-tête Accept-Language que tout navigateur envoie : la première de ses langues que le
 * site propose, l'anglais si aucune ne l'est. Ni pays, ni position, ni cookie : rien n'est retenu.
 * Null sans préférence exprimée (robots d'indexation) : la page demandée est servie telle quelle.
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
