import type { Metadata } from "next";
import { identity } from "@/content/brand/identity";
import { imageAt } from "@/lib/media";

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

/** Métadonnées uniques par page : title, description, canonique, Open Graph, Twitter. */
export function pageMetadata(opts: { title: string; description: string; path: string; image?: string; type?: "website" | "article"; noindex?: boolean }): Metadata {
  const url = absolute(opts.path);
  const image = ogImage(opts.image);
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: url, languages: { "fr-FR": url } },
    openGraph: {
      type: opts.type ?? "website",
      url,
      title: opts.title,
      description: opts.description,
      siteName: identity.name,
      locale: "fr_FR",
      images: [{ url: image, alt: opts.title }],
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image] },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
