import type { Metadata } from "next";
import { identity } from "@/content/brand/identity";
import { imageAt } from "@/lib/media";
import { DEFAULT_LOCALE, HREFLANG, LOCALES, OG_LOCALE, switchLocale, type Locale } from "@/lib/i18n/routing";

export const siteUrl = identity.url.replace(/\/$/, "");
export const absolute = (path: string) => (path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`);

/**
 * Métadonnées par défaut du site : titre et description des pages qui n'en ont pas, du manifeste et
 * des partages. La collection Hypnotic Lace ; des pièces créées sur demande, sans stock, par des
 * artisans français.
 */
export const siteDefaults = {
  title: `${identity.name}, prêt-à-porter féminin créé sur demande`,
  description:
    "Hypnotic Lace, la collection d’Awrea Paris : dentelle, drapés et éclat de la dorure. Chaque pièce est créée sur demande, sans stock, par des artisans français.",
  /**
   * Image de partage par défaut (app/opengraph-image.png, servie à cette adresse) : logo officiel,
   * « Hypnotic Lace » en Fraunces 72pt Italic et une ligne du texte de collection en Cormorant
   * Garamond, sur le blanc cassé de la Maison. Son texte alternatif : app/opengraph-image.alt.txt.
   */
  image: { url: "/opengraph-image.png", width: 1200, height: 630 },
} as const;

/** Image Open Graph absolue (WebP/JPG locaux ou CDN Shopify) */
function ogImage(src?: string) {
  if (!src) return absolute(siteDefaults.image.url);
  if (src.startsWith("http")) return src;
  return absolute(imageAt(src, 960));
}

/**
 * Versions d'une page dans chaque langue (hreflang) : « /boutique » → fr-FR « …/boutique », en
 * « …/en/boutique », et x-default sur le français (langue par défaut). Plan du site et métadonnées.
 */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[HREFLANG[l]] = absolute(switchLocale(path, l));
  out["x-default"] = absolute(switchLocale(path, DEFAULT_LOCALE));
  return out;
}

/**
 * Métadonnées uniques par page : title, description, canonique, versions dans chaque langue, Open
 * Graph, Twitter. `path` : le chemin sans préfixe de langue ; la langue est celle de la page
 * (anglais sous /en), lue par le serveur si elle n'est pas donnée.
 */
export async function pageMetadata(opts: { title: string; description: string; path: string; image?: string; type?: "website" | "article"; noindex?: boolean; locale?: Locale }): Promise<Metadata> {
  // lecture de la requête chargée à la demande : ce module reste pur (données structurées, tests unitaires)
  const locale = opts.locale ?? (await (await import("@/lib/i18n/server")).getLocale());
  const url = absolute(switchLocale(opts.path, locale));
  const image = ogImage(opts.image);
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: url, languages: languageAlternates(opts.path) },
    openGraph: {
      type: opts.type ?? "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: identity.name,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [{ url: image, alt: opts.title }],
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image] },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
