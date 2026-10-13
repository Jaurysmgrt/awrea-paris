/**
 * Webhooks Shopify (signés HMAC-SHA256 avec SHOPIFY_WEBHOOK_SECRET : la clé affichée dans
 * Réglages › Notifications › Webhooks, ou, pour les webhooks d'une application du Dev Dashboard,
 * son secret client SHOPIFY_CLIENT_SECRET).
 * Sujets à abonner dans Shopify (Paramètres → Notifications → Webhooks, format JSON) :
 *   orders/create, orders/updated, fulfillment_events/create,
 *   customers/data_request, customers/redact (RGPD).
 * Chaque commande est recopiée dans la base clientes et rattachée à la cliente de même e-mail ;
 * la livraison déclenche l'e-mail d'entretien ; les agents sont prévenus.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { issueCertificates, sendCertificatesEmail } from "@/lib/certificates";
import { revalidateTag } from "next/cache";
import { NextResponse, after } from "next/server";
import { admin, adminEnabled } from "@/lib/shopify/admin";
import { upsertOrder } from "@/lib/customers/shopify-sync";
import { onOrderDelivered } from "@/lib/marketing/flows";
import { onOrderCreated } from "@/lib/agents/events";
import { classifySource } from "@/components/analytics/source";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { kv } from "@/lib/store";
import type { Order, OrderStatus, Size } from "@/lib/commerce/types";

export const dynamic = "force-dynamic";

type ShopifyOrder = {
  id: number;
  admin_graphql_api_id: string;
  name: string;
  email: string | null;
  created_at: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  total_price: string;
  line_items: { title: string; quantity: number; price: string; variant_title: string | null; product_id: number | null }[];
  shipping_lines: { title: string; price: string }[];
  shipping_address: { country_code: string } | null;
  customer: { first_name: string | null; last_name: string | null } | null;
  landing_site: string | null;
  referring_site: string | null;
  note_attributes: { name: string; value: string }[];
  fulfillments: { tracking_number: string | null; tracking_company: string | null }[];
  payment_gateway_names: string[];
};

function verify(body: string, signature: string | null) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !signature) return false;
  const digest = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const cents = (amount: string) => Math.round(parseFloat(amount) * 100);

async function handlesFor(productIds: number[]): Promise<Record<number, string>> {
  if (!adminEnabled || !productIds.length) return {};
  const ids = [...new Set(productIds)].map((id) => `gid://shopify/Product/${id}`);
  const d = await admin<{ nodes: ({ id: string; handle: string } | null)[] }>(`query H($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { id handle } } }`, { ids });
  return Object.fromEntries(d.nodes.filter(Boolean).map((n) => [Number(n!.id.split("/").pop()), n!.handle]));
}

function statusOf(o: ShopifyOrder): OrderStatus {
  if (o.cancelled_at || o.financial_status === "refunded") return "refunded";
  if (o.fulfillment_status === "fulfilled") return o.fulfillments.some((f) => f.tracking_number) ? "shipped" : "delivered";
  if (o.financial_status === "paid" || o.financial_status === "partially_paid") return "paid";
  return "pending";
}

async function toOrder(o: ShopifyOrder): Promise<Order & { shopifyId: string; source: string | null }> {
  const handles = await handlesFor(o.line_items.map((l) => l.product_id ?? 0).filter(Boolean)).catch(() => ({}) as Record<number, string>);
  const track = o.fulfillments.find((f) => f.tracking_number);
  const attr = (name: string) => o.note_attributes.find((a) => a.name === name)?.value;
  let source: string | null = attr("_source") ?? null;
  if (!source && o.landing_site) {
    try {
      source = classifySource(new URL(o.landing_site, "https://boutique.local"), o.referring_site ?? "");
    } catch {
      source = null;
    }
  }
  return {
    shopifyId: o.admin_graphql_api_id,
    id: o.admin_graphql_api_id,
    number: o.name.replace("#", "AW-"),
    createdAt: o.created_at,
    email: o.email ?? "",
    name: [o.customer?.first_name, o.customer?.last_name?.charAt(0)].filter(Boolean).join(" ") + (o.customer?.last_name ? "." : ""),
    status: statusOf(o),
    lines: o.line_items.map((l) => ({ title: l.title, size: (l.variant_title ?? "TU") as Size, quantity: l.quantity, unitPrice: cents(l.price), handle: (l.product_id && handles[l.product_id]) || "" })),
    total: cents(o.total_price),
    shipping: { method: o.shipping_lines[0]?.title ?? "", price: cents(o.shipping_lines[0]?.price ?? "0"), country: o.shipping_address?.country_code ?? "", tracking: track?.tracking_number ?? undefined, carrier: track?.tracking_company ?? undefined },
    paymentMethod: o.payment_gateway_names.join(", "),
    source,
    consents: attr("_cgv_version") ? { cgvVersion: attr("_cgv_version")!, acceptedAt: attr("_cgv_accepted_at") ?? o.created_at, newsletter: attr("_newsletter") === "1" } : undefined,
  };
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(body, req.headers.get("x-shopify-hmac-sha256"))) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const webhookId = req.headers.get("x-shopify-webhook-id") ?? "";
  // idempotence : Shopify peut renvoyer le même évènement
  if (webhookId && (await kv.get(`webhook:${webhookId}`))) return NextResponse.json({ ok: true, duplicate: true });
  if (webhookId) await kv.set(`webhook:${webhookId}`, Date.now());
  const payload = JSON.parse(body) as Record<string, unknown>;

  if (topic === "orders/create" || topic === "orders/updated") {
    const order = await toOrder(payload as unknown as ShopifyOrder);
    await upsertOrder(order);
    if (topic === "orders/create") {
      after(() => onOrderCreated(order).catch((e) => console.error("[webhook] agents", e)));
      // certificats d'authenticité : émis une seule fois par commande, envoyés à l'acheteuse
      after(() => issueCertificates(order).then((issued) => sendCertificatesEmail(order, issued)).catch((e) => console.error("[webhook] certificats", e)));
    }
  } else if (topic === "fulfillment_events/create" && payload.status === "delivered" && adminEnabled) {
    const orderId = `gid://shopify/Order/${payload.order_id}`;
    const d = await admin<{ order: { name: string; email: string | null; customer: { firstName: string | null } | null; lineItems: { nodes: { title: string; quantity: number; variantTitle: string | null; product: { handle: string } | null }[] } } | null }>(
      `query O($id: ID!) { order(id: $id) { name email customer { firstName } lineItems(first: 20) { nodes { title quantity variantTitle product { handle } } } } }`,
      { id: orderId },
    );
    if (d.order?.email) {
      const delivered: Order = {
        id: orderId,
        number: d.order.name.replace("#", "AW-"),
        createdAt: new Date().toISOString(),
        email: d.order.email,
        name: d.order.customer?.firstName ?? "",
        status: "delivered",
        lines: d.order.lineItems.nodes.map((l) => ({ title: l.title, size: (l.variantTitle ?? "TU") as Size, quantity: l.quantity, unitPrice: 0, handle: l.product?.handle ?? "" })),
        total: 0,
        shipping: { method: "", price: 0, country: "" },
        paymentMethod: "",
      };
      if (isSupabaseConfigured) await supabaseAdmin().from("orders").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("shopify_order_id", orderId);
      after(() => onOrderDelivered(delivered).catch((e) => console.error("[webhook] entretien", e)));
    }
  } else if (topic === "customers/redact" && isSupabaseConfigured) {
    // demande d'effacement transmise par Shopify : on dissocie les commandes de la cliente
    const email = (payload.customer as { email?: string } | undefined)?.email;
    if (email) await supabaseAdmin().from("orders").update({ customer_id: null }).ilike("email", email);
    await kv.push("rgpd:requests", { kind: "effacement (Shopify)", at: new Date().toISOString() }, 1000);
  } else if (topic === "customers/data_request") {
    await kv.push("rgpd:requests", { kind: "accès (Shopify)", at: new Date().toISOString() }, 1000);
  } else if (/^(products|collections|inventory_levels)\//.test(topic)) {
    // catalogue, prix ou stock modifiés dans Shopify : données régénérées dès la visite suivante
    // (rares changements : on préfère une page juste à une page servie de l'ancien cache)
    revalidateTag("shopify", { expire: 0 });
  }
  return NextResponse.json({ ok: true });
}
