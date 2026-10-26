/** Atelier : export comptable d'un mois (?mois=AAAA-MM), au format CSV des tableurs français. */
import { NextResponse } from "next/server";
import { accountingCsv } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const month = new URL(req.url).searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Mois attendu au format AAAA-MM." }, { status: 400 });
  return new NextResponse(await accountingCsv(month), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="awrea-comptabilite-${month}.csv"`, "Cache-Control": "private, no-store" },
  });
}
