/** Atelier : la facture d'une commande en PDF (émise si elle ne l'est pas encore), ou l'avoir (?avoir=1). */
import { NextResponse } from "next/server";
import { getOrder } from "@/lib/commerce/orders";
import { invoiceOf, issueInvoice } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const number = decodeURIComponent((await params).number);
  const order = await getOrder(number);
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  const credit = new URL(req.url).searchParams.get("avoir") === "1";
  const inv = credit ? await invoiceOf(order.number, "avoir") : order.status === "pending" ? null : await issueInvoice(order);
  if (!inv) return NextResponse.json({ error: credit ? "Aucun avoir pour cette commande." : "Commande non payée : pas encore de facture." }, { status: 404 });
  return new NextResponse(Buffer.from(await invoicePdf(inv)), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${inv.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
