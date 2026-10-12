/** Articles du Journal : ceux du dépôt + ceux publiés par l'agent SEO (persistés). */
import { articles as base, type Article } from "@/content/fr/journal";
import { kv } from "@/lib/store";

export const JOURNAL_KEY = "journal:articles";

export async function getArticles(): Promise<Article[]> {
  const published = (await kv.get<Article[]>(JOURNAL_KEY)) ?? [];
  const all = [...published, ...base.filter((a) => !published.some((p) => p.slug === a.slug))];
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticle(slug: string): Promise<Article | null> {
  return (await getArticles()).find((a) => a.slug === slug) ?? null;
}
