/**
 * Atelier : faire avancer une commande d'une étape, en un geste. Les étapes se suivent dans l'ordre
 * (« Commande reçue », « En confection », « Prête », « Expédiée », « Livrée ») : chaque passage est
 * daté et envoie à la cliente l'e-mail de l'étape (documents e-mail-commande-…, modifiables dans
 * Atelier › E-mails ; la livraison garde l'e-mail d'arrivée). L'expédition est confirmée dans
 * l'Atelier et accepte le numéro de suivi du transporteur, facultatif.
 *
 * Avec Shopify : la confection (« En confection », « Prête ») est une étiquette de la commande
 * Shopify posée d'ici ; l'expédition et la livraison se déclarent dans Shopify, le site suit seul.
 * Le paiement (« Commande reçue ») vient toujours de Shopify, jamais d'un geste à la main.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { getOrder, setOrderStatus, setOrderTracking, statusLabel } from "@/lib/commerce/orders";
import { commerceMode } from "@/lib/commerce";
import { nextStage } from "@/lib/customers/order-timeline";
import { recordOrderStage } from "@/lib/store/order-stages";
import { sendOrderStageEmail } from "@/lib/email/commandes";
import { markOrderMade } from "@/lib/certificates";
import { onOrderDelivered } from "@/lib/marketing/flows";
import { logAction } from "@/lib/agents/log";
import { CARRIERS } from "@/app/gestion/commandes/_components/transporteurs";
import type { Order } from "@/lib/commerce/types";

const Body = z
  .object({
    etape: z.enum(["in_production", "ready", "shipped", "delivered"]),
    carrier: z.enum(CARRIERS).optional(),
    // numéro de suivi facultatif : vide, ou lettres, chiffres et traits d'union
    tracking: z
      .string()
      .trim()
      .max(40)
      .regex(/^([A-Za-z0-9-]{6,40})?$/)
      .optional(),
  })
  .strict();

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Étape inconnue, ou numéro de suivi illisible (six caractères au moins, lettres et chiffres)." }, { status: 400 });
  const order = await getOrder(decodeURIComponent((await params).number));
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });

  const { etape, carrier, tracking } = parsed.data;
  // une étape à la fois, dans l'ordre : aucune n'est sautée, chaque e-mail part
  const expected = nextStage(order.status);
  if (etape !== expected) {
    return NextResponse.json(
      { error: expected ? `La commande est à l’étape « ${statusLabel[order.status]} » : la suivante est « ${statusLabel[expected]} ».` : `La commande est à l’étape « ${statusLabel[order.status]} » : elle n’avance plus d’ici.` },
      { status: 409 },
    );
  }
  if (commerceMode !== "demo" && (etape === "shipped" || etape === "delivered")) {
    return NextResponse.json({ error: "Avec Shopify, l’expédition se déclare dans Shopify : le site suit automatiquement." }, { status: 400 });
  }

  const at = new Date().toISOString();
  let shipping = order.shipping;
  if (etape === "shipped" && tracking) {
    shipping = { ...order.shipping, carrier: carrier ?? "Colissimo", tracking };
    await setOrderTracking(order.id, shipping.carrier!, tracking);
  }
  await setOrderStatus(order.id, etape);
  const stages = await recordOrderStage(order, etape, at);
  const updated: Order = { ...order, status: etape, shipping, stages: { ...order.stages, ...stages }, ...(etape === "delivered" ? { deliveredAt: at } : {}) };
  // la pièce est terminée : la date de confection de son certificat est celle du jour
  if (etape === "ready") await markOrderMade(order, at).catch((e) => console.error("[commandes] certificats", e));

  // e-mail de l'étape à la cliente : un échec d'envoi ne défait jamais le passage d'étape
  let mailed = true;
  try {
    if (etape === "delivered") await onOrderDelivered(updated);
    else await sendOrderStageEmail(updated, etape);
  } catch (e) {
    mailed = false;
    console.error("[commandes] e-mail d'étape", e);
  }
  await logAction({
    agent: "systeme",
    kind: "order_stage",
    status: mailed ? "done" : "failed",
    summary: `Commande ${order.number} : ${statusLabel[etape]}${etape === "shipped" && tracking ? ` (${shipping.carrier} ${tracking})` : ""}${mailed ? "" : ", e-mail non envoyé"}`,
  });
  return NextResponse.json({ ok: true, status: etape, mailed, ...(mailed ? {} : { warning: "L’étape est enregistrée, mais l’e-mail à la cliente n’est pas parti. Vous pouvez lui écrire depuis Messages." }) });
}
