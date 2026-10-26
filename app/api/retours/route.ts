/** Demande de retour ou d'échange en libre-service (lien signé de la commande). */
import { NextResponse } from "next/server";
import { z } from "zod";
import { orderFromAccess } from "@/lib/commerce/order-access";
import { returnable } from "@/lib/returns";
import { submitReturn } from "@/lib/returns-flow";
import { getProduct } from "@/lib/commerce";
import { rateLimit } from "@/lib/security/rate-limit";
import type { Size } from "@/lib/commerce/types";

const SizeEnum = z.enum(["XS", "S", "M", "L", "XL", "TU"]);
const Body = z.object({
  number: z.string().min(3).max(20),
  t: z.string().min(10).max(400),
  items: z
    .array(z.object({ index: z.number().int().min(0).max(50), reason: z.enum(["trop-petite", "trop-grande", "tombe", "matiere", "autre"]), wish: z.enum(["remboursement", "echange"]), exchangeSize: SizeEnum.optional() }))
    .min(1)
    .max(20),
  comment: z.string().max(600).optional(),
  accept: z.literal(true),
});

export async function POST(req: Request) {
  const limited = await rateLimit(req, "retours", { limit: 6, windowSeconds: 3600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de choisir au moins une pièce, une raison, et de confirmer l’état de la pièce." }, { status: 400 });
  const d = parsed.data;
  const order = await orderFromAccess(d.number, d.t);
  if (!order) return NextResponse.json({ error: "Ce lien de commande n’est plus valable." }, { status: 403 });
  const { eligible, reason, lines } = await returnable(order);
  if (!eligible) return NextResponse.json({ error: reason }, { status: 409 });
  // une pièce par case : la même pièce ne se retourne pas deux fois dans une demande
  if (new Set(d.items.map((it) => it.index)).size !== d.items.length) return NextResponse.json({ error: "Cette pièce ne peut pas être retournée." }, { status: 400 });
  const items = [];
  for (const it of d.items) {
    const line = lines[it.index];
    if (!line) return NextResponse.json({ error: "Cette pièce ne peut pas être retournée." }, { status: 400 });
    if (it.wish === "echange") {
      const p = await getProduct(line.handle);
      const v = p?.variants.find((x) => x.size === it.exchangeSize);
      if (!v || it.exchangeSize === line.size) return NextResponse.json({ error: `La taille demandée pour ${line.title} n’est pas disponible : choisissez le remboursement ou une autre taille.` }, { status: 409 });
    }
    items.push({ handle: line.handle, title: line.title, size: line.size as Size, unitPrice: line.unitPrice, reason: it.reason, wish: it.wish, exchangeSize: it.wish === "echange" ? it.exchangeSize : undefined });
  }
  const r = await submitReturn(order, items, d.comment);
  return NextResponse.json({ ok: true, id: r.id, labelPending: Boolean(r.labelPending) });
}
