import type { Metadata } from "next";
import { identity } from "@/content/brand/identity";

export const siteUrl = identity.url.replace(/\/$/, "");
export const absolute = (path: string) => (path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`);

/** Image Open Graph absolue (WebP/JPG locaux ou CDN Shopify) */
function ogImage(src?: string) {
  if (!src) return absolute("/media/img/og-default.jpg");
  if (src.startsWith("http")) return src;
  return absolute(/\.(webp|jpg|png)$/.test(src) ? src : `${src}-960.webp`);
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
