/**
 * Synchronisation base clientes ↔ Shopify.
 *  - Inscription / profil : la cliente est créée ou mise à jour dans Shopify (nom, téléphone,
 *    consentement aux lettres), et l'identifiant Shopify est conservé dans Supabase.
 *  - Commandes : reçues par webhook Shopify (/api/webhooks/shopify) et recopiées dans la table
 *    `orders`, rattachées à la cliente par son e-mail.
 */
import "server-only";
import { admin, adminEnabled } from "@/lib/shopify/admin";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { orderLeadTime } from "@/lib/store/order-stages";
import type { LeadTime, Order } from "@/lib/commerce/types";
import type { CustomerProfile } from "./types";

export async function syncCustomerToShopify(p: CustomerProfile): Promise<void> {
  if (!adminEnabled) return;
  const input = {
    email: p.email,
    firstName: p.firstName ?? undefined,
    lastName: p.lastName ?? undefined,
    phone: p.phone ?? undefined,
    locale: p.locale,
    tags: ["site", ...(p.cercleMember ? ["cercle"] : [])],
    emailMarketingConsent: { marketingState: p.marketingEmail ? "SUBSCRIBED" : "NOT_SUBSCRIBED", marketingOptInLevel: "SINGLE_OPT_IN" },
  };
  const found = await admin<{ customers: { nodes: { id: string }[] } }>(`query F($q: String!) { customers(first: 1, query: $q) { nodes { id } } }`, { q: `email:${p.email}` });
  const existing = found.customers.nodes[0]?.id;
  let id: string | undefined = existing;
  if (existing) {
    const { emailMarketingConsent, ...rest } = input;
    await admin(`mutation U($input: CustomerInput!) { customerUpdate(input: $input) { userErrors { message } } }`, { input: { id: existing, ...rest } });
    await admin(
      `mutation M($input: CustomerEmailMarketingConsentUpdateInput!) { customerEmailMarketingConsentUpdate(input: $input) { userErrors { message } } }`,
      { input: { customerId: existing, emailMarketingConsent: { ...emailMarketingConsent, consentUpdatedAt: new Date().toISOString() } } },
    );
  } else {
    const r = await admin<{ customerCreate: { customer: { id: string } | null } }>(
      `mutation C($input: CustomerInput!) { customerCreate(input: $input) { customer { id } userErrors { message } } }`,
      { input },
    );
    id = r.customerCreate.customer?.id;
  }
  if (id && isSupabaseConfigured) await supabaseAdmin().from("customers").update({ shopify_customer_id: id }).eq("id", p.id);
}

/**
 * Recopie une commande Shopify dans la base clientes (appelé par le webhook). La date de chaque
 * étape (stage_dates) est tenue par un déclencheur de la base à chaque changement de statut ; le
 * délai de fabrication annoncé est gardé tel qu'il était à la commande.
 */
export async function upsertOrder(o: Order & { shopifyId: string; source?: string | null; utm?: Record<string, string> | null }) {
  if (!isSupabaseConfigured) return;
  const db = supabaseAdmin();
  const [{ data: c }, { data: known }] = await Promise.all([
    db.from("customers").select("id").ilike("email", o.email).maybeSingle<{ id: string }>(),
    db.from("orders").select("lead_time").eq("shopify_order_id", o.shopifyId).maybeSingle<{ lead_time: LeadTime | null }>(),
  ]);
  // le délai annoncé à la commande ne change plus ensuite, même si la Maison modifie celui d'une pièce
  const leadTime = o.leadTime ?? known?.lead_time ?? (await orderLeadTime(o.lines));
  const { error } = await db.from("orders").upsert(
    {
      shopify_order_id: o.shopifyId,
      customer_id: c?.id ?? null,
      email: o.email,
      number: o.number,
      status: o.status,
      currency: "EUR",
      subtotal: o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      total: o.total,
      items: o.lines,
      shipping: o.shipping,
      customer_name: o.name,
      payment_method: o.paymentMethod,
      gift: Boolean(o.gift?.wrap),
      source: o.source ?? null,
      utm: o.utm ?? null,
      placed_at: o.createdAt,
      // date de livraison : celle de Shopify si elle est connue, sinon posée par le déclencheur au passage à « livrée »
      ...(o.deliveredAt ? { delivered_at: o.deliveredAt } : {}),
      lead_time: leadTime,
    },
    { onConflict: "shopify_order_id" },
  );
  if (error) throw new Error(`orders : ${error.message}`);
}
