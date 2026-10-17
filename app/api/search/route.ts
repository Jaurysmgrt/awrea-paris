import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search";

/** Index de recherche public (quelques kilo-octets), mis en cache et régénéré toutes les cinq minutes. */
export const revalidate = 300;

export async function GET() {
  return NextResponse.json(
    { entries: await buildSearchIndex() },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
