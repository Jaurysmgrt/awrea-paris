import { NextResponse, after } from "next/server";
import { z } from "zod";
import { applyCartAction, CartError, readCart } from "@/lib/commerce/cart";
import { getCustomerSession } from "@/lib/auth/customer";
import { saveCartSnapshot } from "@/lib/customers";
import { getAllProducts } from "@/lib/commerce";
import { assertCanBuy } from "@/lib/drops";

export const dynamic = "force-dynamic";

const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add"), variantId: z.string().min(1), quantity: z.number().int().min(1).max(10).optional() }),
  z.object({ type: z.literal("addMany"), variantIds: z.array(z.string().min(1)).min(1).max(10) }),
  z.object({ type: z.literal("update"), lineId: z.string().min(1), quantity: z.number().int().min(0).max(10) }),
  z.object({ type: z.literal("remove"), lineId: z.string().min(1) }),
  z.object({ type: z.literal("discount"), code: z.string().max(60) }),
  z.object({ type: z.literal("giftCard"), code: z.string().max(60) }),
  z.object({ type: z.literal("gift"), wrap: z.boolean(), message: z.string().max(300) }),
  z.object({ type: z.literal("checkout"), source: z.string().max(40).nullable().optional(), newsletter: z.boolean().optional(), email: z.email().nullable().optional() }),
  z.object({ type: z.literal("clear") }),
]);

export async function GET() {
  return NextResponse.json({ cart: await readCart() });
}

export async function POST(req: Request) {
  const parsed = Action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cette demande n’a pas pu être lue. Merci de réessayer." }, { status: 400 });
  // drops : une pièce pas encore ouverte ne s'achète qu'avec l'accès anticipé ou la vente privée
  const action = parsed.data;
  if (action.type === "add" || action.type === "addMany" || action.type === "checkout") {
    let handles: string[];
    if (action.type === "checkout") handles = (await readCart()).lines.map((l) => l.productHandle);
    else {
      const ids = action.type === "add" ? [action.variantId] : action.variantIds;
      const products = await getAllProducts();
      handles = ids.map((id) => products.find((p) => p.variants.some((v) => v.id === id))?.handle).filter((h): h is string => Boolean(h));
    }
    const blocked = await assertCanBuy(handles);
    if (blocked) return NextResponse.json({ error: blocked, cart: await readCart() }, { status: 403 });
  }
  try {
    const cart = await applyCartAction(parsed.data);
    // cliente connectée ayant accepté la personnalisation : panier mémorisé pour une éventuelle relance
    after(async () => {
      const session = await getCustomerSession().catch(() => null);
      if (!session) return;
      await saveCartSnapshot(
        session,
        cart.lines.map((l) => ({ handle: l.productHandle, title: l.title, size: l.size, quantity: l.quantity, unitPrice: l.unitPrice })),
        cart.subtotal,
      ).catch((e) => console.error("[cart] relance", e));
    });
    return NextResponse.json({ cart });
  } catch (e) {
    const message = e instanceof CartError ? e.message : "Le panier n’a pas pu être mis à jour. Merci de réessayer.";
    if (!(e instanceof CartError)) console.error("[cart]", e);
    return NextResponse.json({ error: message, cart: await readCart() }, { status: 422 });
  }
}
