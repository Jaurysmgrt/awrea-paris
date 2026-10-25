/**
 * Validation de commande — MODE TEST (pilote démo uniquement).
 * En production, le paiement, les taxes, la livraison et la création de commande sont faits
 * par le checkout Shopify ; cette route n'est alors jamais appelée.
 * Chaque pièce est créée sur demande : aucune vérification de stock, la commande est « reçue »
 * puis passe en confection ; le délai annoncé est celui de la pièce la plus longue à faire.
 */
import { NextResponse, after } from "next/server";
import { runCommandesConfectionAgent } from "@/lib/agents/team/commandes-confection";
import { cookies } from "next/headers";
import { z } from "zod";
import { CART_COOKIE, readCart } from "@/lib/commerce/cart";
import { assertCanBuy } from "@/lib/drops";
import { getAllProducts } from "@/lib/commerce";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import { getDoc } from "@/lib/edition/read";
import { getOrders, saveOrder } from "@/lib/commerce/orders";
import { kv } from "@/lib/store";
import { sign } from "@/lib/auth/session";
import { sendOrderStageEmail } from "@/lib/email/commandes";
import { formatPrice } from "@/lib/format";
import { onOrderCreated } from "@/lib/agents/events";
import { shopifyEnabled } from "@/lib/shopify/storefront";
import type { Order } from "@/lib/commerce/types";
import { legalVersions } from "@/content/legal-versions";
import { upsertOrder } from "@/lib/customers/shopify-sync";
import { issueCertificates } from "@/lib/certificates";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { upsertContact } from "@/lib/marketing/provider";
import { orderTaxes, ratesFor, shippingPrice as priceOf } from "@/lib/commerce/international";
import { findRelay } from "@/lib/commerce/relays";
import { issueInvoice } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import { orderAccessToken } from "@/lib/commerce/order-access";

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
  relayId: z.string().max(60).optional(),
  // moyens de paiement de l'article 4 des CGV officielles
  paymentMethod: z.enum(["card", "apple-pay", "google-pay", "paypal"]),
  // mode test : le site ne reçoit jamais de numéro de carte, seulement l'issue simulée
  testOutcome: z.enum(["accepted", "declined", "incomplete"]).optional(),
  acceptTerms: z.literal(true),
  source: z.string().max(40).nullable().optional(),
});

const PAYMENT_LABEL = { card: "Carte bancaire", "apple-pay": "Apple Pay", "google-pay": "Google Pay", paypal: "PayPal" } as const;

export async function POST(req: Request) {
  if (shopifyEnabled) return NextResponse.json({ error: "Le paiement est géré par Shopify." }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de compléter tous les champs requis et d’accepter les conditions générales de vente." }, { status: 400 });
  const d = parsed.data;

  const cart = await readCart();
  if (!cart.lines.length) return NextResponse.json({ error: "Votre panier est vide." }, { status: 400 });
  const blocked = await assertCanBuy(cart.lines.map((l) => l.productHandle));
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  // livraison : mode proposé pour ce pays, point relais vérifié
  const rate = ratesFor(d.country).find((r) => r.id === d.shippingRateId);
  if (!rate) return NextResponse.json({ error: "Ce mode de livraison n’est pas disponible pour ce pays." }, { status: 400 });
  const relay = rate.relay ? findRelay(d.relayId ?? "", d.zip, d.country) : null;
  if (rate.relay && !relay) return NextResponse.json({ error: "Merci de choisir un point relais." }, { status: 400 });
  const merchandise = cart.subtotal - (cart.discount?.amount ?? 0);
  const shippingPrice = priceOf(rate, merchandise);
  // taxes : TVA française incluse, ou export avec droits et TVA du pays payés à la commande
  const { taxes, total: gross } = orderTaxes(d.country, merchandise + (cart.gift.wrap ? cart.giftWrapPrice : 0), shippingPrice);

  // paiement simulé : carte de test refusée
  if (d.paymentMethod === "card") {
    if (d.testOutcome === "declined") return NextResponse.json({ error: "Paiement refusé par la banque (carte de test « refusée »). Essayez 4242 4242 4242 4242." }, { status: 402 });
    if (d.testOutcome !== "accepted") return NextResponse.json({ error: "Numéro de carte incomplet." }, { status: 400 });
  }

  // pièces créées sur demande : aucune vérification de stock, seulement que la pièce existe encore
  // (textes et modèles de délai des documents « commerce » et « catalogue », sans marques d'édition)
  const [products, tCommerce, tCatalogue] = await Promise.all([
    getAllProducts(),
    getDoc<CommerceTexts>("commerce", undefined, { plain: true }),
    getDoc<CatalogueTexts>("catalogue", undefined, { plain: true }),
  ]);
  const lines: Order["lines"] = [];
  for (const l of cart.lines) {
    const p = products.find((x) => x.handle === l.productHandle);
    const v = p?.variants.find((x) => x.id === l.variantId);
    if (!p || !v) return NextResponse.json({ error: fill(tCommerce.commande.plusProposee, { piece: l.title }) }, { status: 409 });
    lines.push({ title: p.title, size: v.size, quantity: l.quantity, unitPrice: p.price, handle: p.handle });
  }

  const total = Math.max(0, gross - (cart.giftCard?.amount ?? 0));
  const count = (await getOrders()).length;
  const order: Order = {
    id: `o-${Date.now().toString(36)}`,
    number: `AW-${1031 + count}`,
    createdAt: new Date().toISOString(),
    email: d.email,
    name: `${d.firstName} ${d.lastName.charAt(0)}.`,
    // première étape : commande reçue (la Maison la passe ensuite en confection, prête, expédiée)
    status: "paid",
    lines,
    total,
    shipping: {
      method: rate.label,
      price: shippingPrice,
      country: d.country,
      ...(relay ? { relay: { id: relay.id, name: relay.name, address: relay.address } } : {}),
      ...(rate.pickup ? { pickup: true } : {}),
    },
    address: { firstName: d.firstName, lastName: d.lastName, line1: d.address1, line2: d.address2, postalCode: d.zip, city: d.city, country: d.country, phone: d.phone },
    taxes,
    ...(cart.discount ? { discount: cart.discount } : {}),
    ...(cart.giftCard ? { giftCard: cart.giftCard } : {}),
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

  // facture émise dès le paiement (numérotation continue), jointe à l'e-mail de confirmation
  const invoice = await issueInvoice(order).catch((e) => {
    console.error("[checkout] facture", e);
    return null;
  });
  const invoiceFile = invoice ? await invoicePdf(invoice).catch(() => null) : null;

  // un certificat d'authenticité numérique par pièce (QR code, rattachement au compte)
  await issueCertificates(order).catch((e) => {
    console.error("[checkout] certificats", e);
    return [];
  });

  // e-mail « Commande reçue » (document email-commande-recue, modifiable dans l'Atelier) : détail des
  // pièces avec leur délai, totaux de la commande, liens des certificats et codes de rattachement,
  // facture jointe ; il ne part qu'une fois par commande
  const tp = tCommerce.panier;
  await sendOrderStageEmail(order, "paid", {
    attachments: invoice && invoiceFile ? [{ filename: `${invoice.number}.pdf`, content: invoiceFile }] : undefined,
    items: lines.map((l) => {
      const p = products.find((x) => x.handle === l.handle);
      return {
        title: l.title,
        meta: [fill(tCommerce.confirmation.taille, { taille: l.size }), l.quantity > 1 ? fill(tCommerce.commande.pieces, { n: l.quantity }) : null, p ? fill(tCatalogue.fabrication.delaiTexte, { delai: delaiText(tCatalogue, p.leadTime) }) : null].filter(Boolean).join(" · "),
        price: formatPrice(l.unitPrice * l.quantity),
        image: p?.images[0]?.src,
      };
    }),
    totals: [
      { label: fill(tCommerce.confirmation.livraison, { mode: relay ? `${rate.label}, ${relay.name}` : rate.label }), value: shippingPrice ? formatPrice(shippingPrice) : tp.offerte },
      ...(cart.gift.wrap ? [{ label: tp.emballage, value: formatPrice(cart.giftWrapPrice) }] : []),
      ...(taxes.export ? [{ label: tCommerce.commande.droitsEtTaxes, value: formatPrice(taxes.export.duty + taxes.export.importVat) }] : []),
      { label: taxes.export ? tCommerce.commande.totalTaxes : tp.total, value: formatPrice(total) },
    ],
  }).catch((e) => console.error("[checkout] e-mail", e));

  await onOrderCreated(order).catch((e) => console.error("[checkout] agents", e));
  after(() => runCommandesConfectionAgent("evenement").catch((e) => console.error("[agent commandes-confection]", e)));

  const token = sign({ n: order.number }, 60 * 60 * 24 * 7);
  return NextResponse.json({ ok: true, number: order.number, token, access: orderAccessToken(order) });
}
