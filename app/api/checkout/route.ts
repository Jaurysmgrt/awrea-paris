/**
 * Validation de commande — MODE TEST (pilote démo uniquement).
 * En production, le paiement, les taxes, la livraison et la création de commande sont faits
 * par le checkout Shopify ; cette route n'est alors jamais appelée.
 */
import { NextResponse, after } from "next/server";
import { runCommandesStockAgent } from "@/lib/agents/team/commandes-stock";
import { cookies } from "next/headers";
import { z } from "zod";
import { CART_COOKIE, readCart } from "@/lib/commerce/cart";
import { getAllProducts } from "@/lib/commerce";
import { DEMO_KEYS } from "@/lib/commerce/catalog-demo";
import { getOrders, saveOrder } from "@/lib/commerce/orders";
import { kv } from "@/lib/store";
import { shop } from "@/content/settings";
import { sign } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { formatPrice } from "@/lib/format";
import { onOrderCreated } from "@/lib/agents/events";
import { shopifyEnabled } from "@/lib/shopify/storefront";
import type { Order } from "@/lib/commerce/types";
import { imageAt } from "@/lib/media";
import { legalVersions } from "@/content/legal-versions";
import { upsertOrder } from "@/lib/customers/shopify-sync";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { upsertContact } from "@/lib/marketing/provider";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.email(),
  newsletter: z.boolean().optional(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  address1: z.string().min(3).max(160),
  address2: z.string().max(160).optional(),
  zip: z.string().min(2).max(12),
  city: z.string().min(1).max(80),
  country: z.string().length(2),
  phone: z.string().max(30).optional(),
  shippingRateId: z.string(),
  paymentMethod: z.enum(["card", "apple-pay", "google-pay", "paypal", "installments"]),
  // mode test : le site ne reçoit jamais de numéro de carte, seulement l'issue simulée
  testOutcome: z.enum(["accepted", "declined", "incomplete"]).optional(),
  acceptTerms: z.literal(true),
  source: z.string().max(40).nullable().optional(),
});

const PAYMENT_LABEL = { card: "Carte bancaire", "apple-pay": "Apple Pay", "google-pay": "Google Pay", paypal: "PayPal", installments: "Paiement en 3 ou 4 fois" } as const;

export async function POST(req: Request) {
  if (shopifyEnabled) return NextResponse.json({ error: "Le paiement est géré par Shopify." }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de compléter tous les champs requis et d’accepter les conditions générales de vente." }, { status: 400 });
  const d = parsed.data;

  const cart = await readCart();
  if (!cart.lines.length) return NextResponse.json({ error: "Votre panier est vide." }, { status: 400 });

  // livraison
  const zone = shop.countries.find((c) => c.code === d.country)?.zone;
  const rate = shop.shippingRates.find((r) => r.id === d.shippingRateId && r.zone === zone);
  if (!zone || !rate) return NextResponse.json({ error: "Ce mode de livraison n’est pas disponible pour ce pays." }, { status: 400 });
  const merchandise = cart.subtotal - (cart.discount?.amount ?? 0);
  const shippingPrice = rate.freeAboveThreshold && merchandise >= shop.freeShippingThreshold ? 0 : rate.price;

  // paiement simulé : carte de test refusée
  if (d.paymentMethod === "card") {
    if (d.testOutcome === "declined") return NextResponse.json({ error: "Paiement refusé par la banque (carte de test « refusée »). Essayez 4242 4242 4242 4242." }, { status: 402 });
    if (d.testOutcome !== "accepted") return NextResponse.json({ error: "Numéro de carte incomplet." }, { status: 400 });
  }

  // stocks et numéros d'édition
  const products = await getAllProducts();
  const stock = (await kv.get<Record<string, number>>(DEMO_KEYS.stock)) ?? {};
  const produced = (await kv.get<Record<string, number>>(DEMO_KEYS.produced)) ?? {};
  const lines: Order["lines"] = [];
  let anyPreorder = false;
  for (const l of cart.lines) {
    const p = products.find((x) => x.handle === l.productHandle);
    const v = p?.variants.find((x) => x.id === l.variantId);
    if (!p || !v) return NextResponse.json({ error: `${l.title} n’est plus disponible.` }, { status: 409 });
    const fromStock = Math.min(v.quantity, l.quantity);
    const toMake = l.quantity - fromStock;
    if (toMake > 0 && !v.preorder) return NextResponse.json({ error: `${p.title} en taille ${v.size} vient d’être épuisée.` }, { status: 409 });
    if (toMake > 0) anyPreorder = true;
    stock[v.id] = v.quantity - fromStock;
    for (let i = 0; i < l.quantity; i++) {
      const already = produced[p.handle] ?? p.edition.produced;
      const within = already < p.edition.total;
      if (within) produced[p.handle] = already + 1;
      lines.push({
        title: p.title,
        size: v.size,
        quantity: 1,
        unitPrice: p.price,
        handle: p.handle,
        editionLabel: p.edition.total === 1 ? "Pièce unique" : within ? `N° ${already + 1} / ${p.edition.total}` : "Sur commande",
      });
    }
  }
  await Promise.all([kv.set(DEMO_KEYS.stock, stock), kv.set(DEMO_KEYS.produced, produced)]);

  const total = cart.total + shippingPrice;
  const count = (await getOrders()).length;
  const order: Order = {
    id: `o-${Date.now().toString(36)}`,
    number: `AW-${1031 + count}`,
    createdAt: new Date().toISOString(),
    email: d.email,
    name: `${d.firstName} ${d.lastName.charAt(0)}.`,
    status: anyPreorder ? "in_production" : "paid",
    lines,
    total,
    shipping: { method: rate.label, price: shippingPrice, country: d.country },
    gift: cart.gift.wrap ? cart.gift : undefined,
    paymentMethod: PAYMENT_LABEL[d.paymentMethod],
    source: d.source ?? null,
    consents: { cgvVersion: legalVersions.cgv, acceptedAt: new Date().toISOString(), newsletter: Boolean(d.newsletter) },
  };
  await saveOrder(order);
  // base clientes : commande recopiée et rattachée au compte de même e-mail
  after(() => upsertOrder({ ...order, shopifyId: `demo-${order.id}`, source: order.source }).catch((e) => console.error("[checkout] base clientes", e)));
  if (d.newsletter) {
    const list = (await kv.get<{ email: string; date: string; source?: string }[]>("newsletter:subscribers")) ?? [];
    if (!list.some((s) => s.email === d.email)) await kv.set("newsletter:subscribers", [...list, { email: d.email, date: order.createdAt, source: "commande" }]);
    after(async () => {
      await upsertContact({ email: d.email, firstName: d.firstName, lastName: d.lastName, marketing: true }).catch((e) => console.error("[checkout] e-mails", e));
      await onNewsletterSignup(d.email).catch(() => {});
    });
  }
  (await cookies()).delete(CART_COOKIE);

  await sendEmail({
    to: d.email,
    subject: `Votre commande ${order.number}`,
    tag: "confirmation-commande",
    ...brandEmail({
      preheader: "Votre pièce est entre les mains de l’atelier.",
      title: "Merci pour votre commande",
      paragraphs: [
        `Bonjour ${d.firstName},`,
        anyPreorder
          ? "Votre commande est confirmée. Une partie de vos pièces est désormais en fabrication à l’atelier : nous vous écrirons dès leur expédition."
          : `Votre commande est confirmée. Votre pièce sera pliée dans du papier de soie et expédiée sous ${shop.dispatchDays}, avec son certificat numéroté.`,
      ],
      items: lines.map((l) => ({ title: l.title, meta: `Taille ${l.size} · ${l.editionLabel}`, price: l.unitPrice, image: imageAt(products.find((p) => p.handle === l.handle)?.images[0].src ?? "", 480) })),
      totals: [
        { label: "Livraison", value: shippingPrice ? formatPrice(shippingPrice) : "Offerte" },
        ...(cart.gift.wrap ? [{ label: "Emballage cadeau", value: formatPrice(cart.giftWrapPrice) }] : []),
        { label: "Total", value: formatPrice(total) },
      ],
      cta: { label: "Suivre ma commande", href: "/compte" },
      signature: "Avec toute notre gratitude,\nLa Créatrice",
      footnote: `Commande ${order.number} · ${order.paymentMethod} · mode test`,
    }),
  }).catch((e) => console.error("[checkout] e-mail", e));

  await onOrderCreated(order).catch((e) => console.error("[checkout] agents", e));
  after(() => runCommandesStockAgent("evenement").catch((e) => console.error("[agent commandes-stock]", e)));

  const token = sign({ n: order.number }, 60 * 60 * 24 * 7);
  return NextResponse.json({ ok: true, number: order.number, token });
}
