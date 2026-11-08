/**
 * Commande de la boutique de la Maison : panier relu, livraison et taxes calculées par le site, puis
 * paiement.
 * - Stripe (lib/paiement) : la commande est enregistrée « en attente de paiement », la page de
 *   paiement sécurisée de Stripe s'ouvre (une seule par commande : un double clic ou un nouvel essai
 *   reprend la même) ; la commande devient « reçue » quand Stripe confirme le paiement (webhook signé,
 *   ou retour de la cliente vérifié auprès de Stripe).
 * - Démonstration sans Stripe : paiement d'essai, aucun argent ne bouge.
 * - Boutique réelle sans paiement branché : aucune commande (lib/config/boutique.ts).
 * Chaque pièce est créée sur demande : aucune vérification de stock, le délai annoncé est celui de
 * la pièce la plus longue à faire. Aucune donnée bancaire ne passe par le site.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { CART_COOKIE, noterCommandeOuverte, readCart } from "@/lib/commerce/cart";
import { assertCanBuy } from "@/lib/drops";
import { getAllProducts } from "@/lib/commerce";
import { fill, type CommerceTexts } from "@/lib/commerce/texts";
import { getDoc } from "@/lib/edition/read";
import { getOrders, saveOrder } from "@/lib/commerce/orders";
import { kv } from "@/lib/store";
import { sign } from "@/lib/auth/session";
import { commandesOuvertes, paiementEnLigne, stripeEnTest } from "@/lib/config/boutique";
import type { Order } from "@/lib/commerce/types";
import { legalVersions } from "@/content/legal-versions";
import { orderTaxes, ratesFor, shippingPrice as priceOf } from "@/lib/commerce/international";
import { findRelay } from "@/lib/commerce/relays";
import { orderAccessToken } from "@/lib/commerce/order-access";
import { finaliserCommande } from "@/lib/commerce/finalisation";
import { avecEvenement, paiementEnAttente } from "@/lib/paiement/types";
import { ouvrirPaiement, paiementNonOuvert } from "@/lib/paiement/suivi";
import { prendreVerrou, rendreVerrou } from "@/lib/store/verrou";
import { rateLimit } from "@/lib/security/rate-limit";
import { siteUrl } from "@/lib/seo/metadata";
import { getLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/routing";

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
  // paiement d'essai seulement : moyens de l'article 4 des CGV officielles (avec Stripe, ils se
  // choisissent sur la page de Stripe)
  paymentMethod: z.enum(["card", "apple-pay", "google-pay", "paypal"]).optional(),
  // mode test : le site ne reçoit jamais de numéro de carte, seulement l'issue simulée
  testOutcome: z.enum(["accepted", "declined", "incomplete"]).optional(),
  acceptTerms: z.literal(true),
  source: z.string().max(40).nullable().optional(),
});

const PAYMENT_LABEL = { card: "Carte bancaire", "apple-pay": "Apple Pay", "google-pay": "Google Pay", paypal: "PayPal" } as const;

/** Montant minimal d'un paiement par carte chez Stripe en euros (centimes). */
const MINIMUM_STRIPE = 50;

/**
 * Adresse du site pour les retours de Stripe : celle de la requête seulement si elle est l'une des
 * adresses du site (domaine, déploiement Vercel, poste local) ; sinon le domaine du site. Un en-tête
 * Host forgé ne peut pas envoyer la cliente ailleurs.
 */
function origineDuSite(req: Request): string {
  const demandee = new URL(req.url).origin;
  const vercel = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL].filter(Boolean).map((h) => `https://${h}`);
  const connues = [siteUrl, ...vercel];
  if (connues.includes(demandee)) return demandee;
  if (!process.env.VERCEL && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(demandee)) return demandee;
  return vercel[0] ?? siteUrl;
}

export async function POST(req: Request) {
  // chaque envoi enregistre une commande et ouvre une page de paiement : quelques-uns par visiteuse
  const limite = await rateLimit(req, "checkout", { limit: 12, windowSeconds: 600 });
  if (limite) return limite;
  const tCommerce = await getDoc<CommerceTexts>("commerce", undefined, { plain: true });
  const te = tCommerce.commande.stripe.erreurs;
  if (!commandesOuvertes()) return NextResponse.json({ error: te.fermee }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de compléter tous les champs requis et d’accepter les conditions générales de vente." }, { status: 400 });
  const d = parsed.data;
  const stripe = paiementEnLigne();
  if (!stripe && !d.paymentMethod) return NextResponse.json({ error: te.moyen }, { status: 400 });

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

  // paiement d'essai : carte de test refusée
  if (!stripe && d.paymentMethod === "card") {
    if (d.testOutcome === "declined") return NextResponse.json({ error: "Paiement refusé par la banque (carte de test « refusée »). Essayez 4242 4242 4242 4242." }, { status: 402 });
    if (d.testOutcome !== "accepted") return NextResponse.json({ error: "Numéro de carte incomplet." }, { status: 400 });
  }

  // pièces créées sur demande : aucune vérification de stock, seulement que la pièce existe encore
  // (textes et modèles de délai des documents « commerce » et « catalogue », sans marques d'édition)
  const products = await getAllProducts();
  const lines: Order["lines"] = [];
  for (const l of cart.lines) {
    const p = products.find((x) => x.handle === l.productHandle);
    const v = p?.variants.find((x) => x.id === l.variantId);
    if (!p || !v) return NextResponse.json({ error: fill(tCommerce.commande.plusProposee, { piece: l.title }) }, { status: 409 });
    lines.push({ title: p.title, size: v.size, quantity: l.quantity, unitPrice: p.price, handle: p.handle });
  }

  const total = Math.max(0, gross - (cart.giftCard?.amount ?? 0));
  const address = { firstName: d.firstName, lastName: d.lastName, line1: d.address1, line2: d.address2, postalCode: d.zip, city: d.city, country: d.country, phone: d.phone };

  // Stripe : la même commande (même panier, même adresse, même livraison) ne s'enregistre qu'une
  // fois ; tant que sa page de paiement est valable, un nouvel essai la reprend
  const empreinte = createHash("sha256")
    .update(JSON.stringify({ l: cart.lines.map((l) => [l.variantId, l.quantity]), total, e: d.email.toLowerCase(), address, r: rate.id, p: relay?.id ?? null, g: cart.gift, c: [cart.discount?.code ?? null, cart.giftCard?.code ?? null] }))
    .digest("hex")
    .slice(0, 32);
  // la commande enregistrée, puis la page de paiement Stripe ou le paiement d'essai
  const enregistrer = async (): Promise<Response> => {
    // numéro de commande unique, même pour deux commandes passées au même instant
    let n = 1031 + (await getOrders()).length;
    while ((await kv.incr(`commandes:numero:${n}`, 60 * 60 * 24 * 365 * 20)) !== 1) n++;
    const at = new Date().toISOString();
    const order: Order = {
      id: `o-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      number: `AW-${n}`,
      createdAt: at,
      email: d.email,
      name: `${d.firstName} ${d.lastName.charAt(0)}.`,
      // essai : commande reçue aussitôt ; Stripe : en attente jusqu'à la confirmation du paiement
      status: stripe ? "pending" : "paid",
      lines,
      total,
      shipping: {
        method: rate.label,
        price: shippingPrice,
        country: d.country,
        ...(relay ? { relay: { id: relay.id, name: relay.name, address: relay.address } } : {}),
        ...(rate.pickup ? { pickup: true } : {}),
      },
      address,
      taxes,
      ...(cart.discount ? { discount: cart.discount } : {}),
      ...(cart.giftCard ? { giftCard: cart.giftCard } : {}),
      gift: cart.gift.wrap ? cart.gift : undefined,
      paymentMethod: stripe ? "Stripe" : PAYMENT_LABEL[d.paymentMethod!],
      source: d.source ?? null,
      consents: { cgvVersion: legalVersions.cgv, acceptedAt: at, newsletter: Boolean(d.newsletter) },
      payment: stripe
        ? { ...paiementEnAttente("stripe", total, stripeEnTest()), empreinte }
        : avecEvenement({ ...paiementEnAttente("essai", total), statut: "reussi" }, { at, type: "essai", resume: `Paiement d’essai accepté (${PAYMENT_LABEL[d.paymentMethod!]}), aucun argent ne bouge` }),
    };
    const token = sign({ n: order.number }, 60 * 60 * 24 * 7);

    if (stripe) {
      await saveOrder(order);
      await noterCommandeOuverte(order.id);
      const locale = await getLocale();
      const origine = origineDuSite(req);
      const ts = tCommerce.commande.stripe;
      try {
        const url = await ouvrirPaiement(order, {
          locale,
          retour: `${origine}${localizePath(`/commande/confirmation?n=${encodeURIComponent(order.number)}&t=${encodeURIComponent(token)}`, locale)}&s={CHECKOUT_SESSION_ID}`,
          abandon: `${origine}${localizePath("/commande?paiement=annule", locale)}`,
          libelles: { commande: ts.ligneCommande, livraison: ts.ligneLivraison, emballage: tCommerce.panier.emballage, taille: ts.ligneTaille },
        });
        return NextResponse.json({ ok: true, redirect: url });
      } catch (e) {
        console.error("[checkout] ouverture du paiement Stripe", e);
        await paiementNonOuvert(order, e instanceof Error ? e.message : String(e));
        return NextResponse.json({ error: te.ouverture }, { status: 502 });
      }
    }

    // paiement d'essai : la commande est reçue aussitôt, le panier vidé
    (await cookies()).delete(CART_COOKIE);
    // une étape en échec (facture, e-mail) n'empêche pas la commande d'être reçue : elle est consignée
    await finaliserCommande(order).catch((e) => console.error("[checkout] finalisation", e));
    return NextResponse.json({ ok: true, number: order.number, token, access: orderAccessToken(order) });
  };

  if (!stripe) return enregistrer();
  // un paiement en ligne a un minimum : la commande n'est pas enregistrée en dessous
  if (total < MINIMUM_STRIPE) return NextResponse.json({ error: te.montantMinimum }, { status: 400 });
  // deux envois simultanés de la même commande (double clic, deux onglets) : un seul passe
  const jeton = await prendreVerrou(`commande:${empreinte}`, 30_000);
  if (!jeton) return NextResponse.json({ error: te.enCours }, { status: 409 });
  try {
    const enCours = (await getOrders()).find((o) => o.status === "pending" && o.payment?.empreinte === empreinte && o.payment.statut === "en-attente" && o.payment.url && Date.parse(o.payment.expireLe ?? "") > Date.now() + 2 * 60_000);
    if (enCours?.payment?.url) {
      await noterCommandeOuverte(enCours.id);
      return NextResponse.json({ ok: true, redirect: enCours.payment.url });
    }
    return await enregistrer();
  } finally {
    await rendreVerrou(`commande:${empreinte}`, jeton);
  }
}
