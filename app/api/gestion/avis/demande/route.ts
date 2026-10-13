import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { getOrder } from "@/lib/commerce/orders";
import { sendReviewRequest } from "@/lib/marketing/flows";

/** Atelier : envoyer la demande d'avis d'une commande (sans attendre le quatorzième jour). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ number: z.string().trim().max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Commande inconnue." }, { status: 400 });
  const order = await getOrder(parsed.data.number);
  if (!order) return NextResponse.json({ error: "Commande inconnue." }, { status: 404 });
  await sendReviewRequest(order);
  return NextResponse.json({ ok: true, message: `Demande d’avis envoyée à ${order.email}.` });
}
