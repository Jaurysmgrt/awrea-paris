/** Liste des pages publiques — partagée par le sitemap, llms.txt et l'audit SEO. */
import { getAllProducts, getCollections } from "@/lib/commerce";
import { getArticles } from "@/lib/content/journal";

export const STATIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/boutique", priority: 0.9, changeFrequency: "daily" },
  { path: "/collections", priority: 0.8, changeFrequency: "weekly" },
  { path: "/silhouettes", priority: 0.7, changeFrequency: "weekly" },
  { path: "/la-maison", priority: 0.8, changeFrequency: "monthly" },
  { path: "/atelier", priority: 0.7, changeFrequency: "monthly" },
  { path: "/journal", priority: 0.6, changeFrequency: "weekly" },
  { path: "/presse", priority: 0.4, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/livraison-retours", priority: 0.4, changeFrequency: "yearly" },
  { path: "/cgv", priority: 0.2, changeFrequency: "yearly" },
  { path: "/mentions-legales", priority: 0.1, changeFrequency: "yearly" },
  { path: "/confidentialite", priority: 0.1, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.1, changeFrequency: "yearly" },
  { path: "/cgu", priority: 0.1, changeFrequency: "yearly" },
  { path: "/propriete-intellectuelle", priority: 0.1, changeFrequency: "yearly" },
  { path: "/assistant-ia", priority: 0.2, changeFrequency: "yearly" },
  { path: "/retractation", priority: 0.2, changeFrequency: "yearly" },
];

export async function allPublicPaths(): Promise<{ path: string; lastModified?: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[]> {
  const [products, collections, articles] = await Promise.all([getAllProducts(), getCollections(), getArticles()]);
  return [
    ...STATIC_ROUTES,
    ...collections.map((c) => ({ path: `/collections/${c.handle}`, priority: c.current ? 0.9 : 0.6, changeFrequency: "weekly" as const })),
    ...products.map((p) => ({ path: `/boutique/${p.handle}`, lastModified: p.publishedAt, priority: 0.8, changeFrequency: "daily" as const })),
    ...articles.map((a) => ({ path: `/journal/${a.slug}`, lastModified: a.date, priority: 0.5, changeFrequency: "monthly" as const })),
  ];
}
