import { NextResponse } from "next/server";
import { getPublicProducts } from "@/lib/commerce";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/routing";

/**
 * Catalogue public léger (liste d'envies, assistant) : jamais les pièces d'un drop pas encore ouvert.
 * `langue` : fiches de la version anglaise (en), sinon en français.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const handles = params.get("handles")?.split(",").filter(Boolean);
  const langue = params.get("langue") ?? "";
  const all = await getPublicProducts(isLocale(langue) ? langue : DEFAULT_LOCALE);
  const list = handles ? all.filter((p) => handles.includes(p.handle)) : all;
  return NextResponse.json({ products: list });
}
