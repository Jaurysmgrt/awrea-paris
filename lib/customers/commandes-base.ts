/**
 * Copie des commandes de la boutique dans la base clientes (table `orders`), rattachées à la
 * cliente par son e-mail : son compte montre ses commandes, l'Atelier ses achats.
 */
import "server-only";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { orderLeadTime, orderRowKey } from "@/lib/store/order-stages";
import type { LeadTime, Order } from "@/lib/commerce/types";

/**
 * Recopie une commande dans la base clientes (au paiement). La date de chaque étape (stage_dates)
 * est tenue par un déclencheur de la base à chaque changement de statut ; le délai de fabrication
 * annoncé est gardé tel qu'il était à la commande.
 */
export async function upsertOrder(o: Order & { source?: string | null; utm?: Record<string, string> | null }) {
  if (!isSupabaseConfigured) return;
  const db = supabaseAdmin();
  const [{ data: c }, { data: known }] = await Promise.all([
    db.from("customers").select("id").ilike("email", o.email).maybeSingle<{ id: string }>(),
    db.from("orders").select("lead_time").eq("reference", orderRowKey(o)).maybeSingle<{ lead_time: LeadTime | null }>(),
  ]);
  // le délai annoncé à la commande ne change plus ensuite, même si la Maison modifie celui d'une pièce
  const leadTime = o.leadTime ?? known?.lead_time ?? (await orderLeadTime(o.lines));
  const { error } = await db.from("orders").upsert(
    {
      reference: orderRowKey(o),
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
      // date de livraison : celle de la commande si elle est connue, sinon posée par le déclencheur au passage à « livrée »
      ...(o.deliveredAt ? { delivered_at: o.deliveredAt } : {}),
      lead_time: leadTime,
    },
    { onConflict: "reference" },
  );
  if (error) throw new Error(`orders : ${error.message}`);
}
