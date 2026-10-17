/**
 * Atelier (démonstration) : marquer une commande expédiée (transporteur et suivi) ou livrée ; les
 * e-mails d'expédition et de livraison partent. Avec Shopify, ces étapes viennent de Shopify.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder, setOrderStatus, setOrderTracking } from "@/lib/commerce/orders";
import { commerceMode } from "@/lib/commerce";
import { onOrderDelivered, onOrderShipped } from "@/lib/marketing/flows";
import { logAction } from "@/lib/agents/log";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("expediee"), carrier: z.enum(["Colissimo", "Chronopost", "Mondial Relay", "DHL"]), tracking: z.string().trim().min(6).max(40).regex(/^[A-Za-z0-9-]+$/) }),
  z.object({ action: z.literal("livree") }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  if (commerceMode !== "demo") return NextResponse.json({ error: "Avec Shopify, l’expédition se déclare dans Shopify (le site suit automatiquement)." }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Transporteur et numéro de suivi attendus." }, { status: 400 });
  const order = await getOrder(decodeURIComponent((await params).number));
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  const a = parsed.data;
  if (a.action === "expediee") {
    await setOrderTracking(order.id, a.carrier, a.tracking);
    await setOrderStatus(order.id, "shipped");
    await onOrderShipped({ ...order, status: "shipped", shipping: { ...order.shipping, carrier: a.carrier, tracking: a.tracking } });
    await logAction({ agent: "systeme", kind: "update_stock", status: "done", summary: `Commande ${order.number} expédiée (${a.carrier} ${a.tracking})` });
  } else {
    await setOrderStatus(order.id, "delivered");
    await onOrderDelivered({ ...order, status: "delivered", deliveredAt: new Date().toISOString() });
    await logAction({ agent: "systeme", kind: "update_stock", status: "done", summary: `Commande ${order.number} livrée` });
  }
  return NextResponse.json({ ok: true });
}
