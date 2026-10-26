import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/i18n/routing";

/**
 * Index de recherche d'une autre langue que le français (/api/search/en, recherche plein écran de
 * la version anglaise), mis en cache et régénéré toutes les cinq minutes comme /api/search.
 */
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((langue) => ({ langue }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ langue: string }> }) {
  const { langue } = await params;
  if (!isLocale(langue) || langue === DEFAULT_LOCALE) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ entries: await buildSearchIndex(langue) }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
