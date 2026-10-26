/** La facture d'une commande pour la cliente, par son lien signé (suivi de commande, e-mails, compte). */
import { NextResponse } from "next/server";
import { orderFromAccess } from "@/lib/commerce/order-access";
import { issueInvoice } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const limited = await rateLimit(req, "facture", { limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  const order = await orderFromAccess(decodeURIComponent((await params).number), new URL(req.url).searchParams.get("t"));
  if (!order || order.status === "pending") return NextResponse.json({ error: "Lien de facture non valable." }, { status: 404 });
  const inv = await issueInvoice(order);
  return new NextResponse(Buffer.from(await invoicePdf(inv)), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${inv.number}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
