import type { MetadataRoute } from "next";
import { allPublicPaths } from "@/lib/seo/routes";
import { absolute, languageAlternates } from "@/lib/seo/metadata";
import { LOCALES, switchLocale } from "@/lib/i18n/routing";

export const revalidate = 3600;

/** Chaque page dans chaque langue (français à la racine, anglais sous /en), avec ses versions (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return (await allPublicPaths()).flatMap((p) =>
    LOCALES.map((locale) => ({
      url: absolute(switchLocale(p.path, locale)),
      lastModified: p.lastModified ? new Date(p.lastModified) : now,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
      alternates: { languages: languageAlternates(p.path) },
    })),
  );
}
