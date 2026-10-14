/** L'étiquette d'un retour, pour la cliente (lien signé de la commande). */
import { NextResponse } from "next/server";
import { getReturn } from "@/lib/returns";
import { returnLabelPdf } from "@/lib/returns-flow";
import { orderFromAccess } from "@/lib/commerce/order-access";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, "etiquette", { limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  const r = await getReturn((await params).id);
  const order = r ? await orderFromAccess(r.orderNumber, new URL(req.url).searchParams.get("t")) : null;
  const pdf = r && order ? await returnLabelPdf(r, order) : null;
  if (!pdf) return NextResponse.json({ error: "Étiquette indisponible." }, { status: 404 });
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="etiquette-${r!.id}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
