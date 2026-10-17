import type { MetadataRoute } from "next";
import { allPublicPaths } from "@/lib/seo/routes";
import { absolute } from "@/lib/seo/metadata";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return (await allPublicPaths()).map((p) => ({
    url: absolute(p.path),
    lastModified: p.lastModified ? new Date(p.lastModified) : now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
    alternates: { languages: { "fr-FR": absolute(p.path) } },
  }));
}
