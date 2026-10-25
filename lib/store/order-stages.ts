/**
 * Étapes des commandes : la date de chaque passage (reçue, en confection, prête, expédiée, livrée)
 * et le délai de fabrication annoncé, pour la frise du compte, du suivi, de la confirmation et de
 * l'Atelier.
 *
 * Stockage : le stockage technique (clé « orders:stages ») pour les commandes du site ; avec la base
 * clientes (Supabase), la colonne orders.stage_dates est tenue par un déclencheur à chaque
 * changement de statut (migration 20261018000000_creation_sur_demande).
 */
import "server-only";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { getAllProducts } from "@/lib/commerce";
import { longestLeadTime } from "@/lib/commerce/availability";
import { orderTimeline, type OrderTimeline } from "@/lib/customers/order-timeline";
import type { LeadTime, Order, OrderStage, OrderStageDates } from "@/lib/commerce/types";

export const ORDER_STAGES_KEY = "orders:stages";

type StageMap = Record<string, OrderStageDates>;

/** Identifiant de la commande dans la base clientes (copie des commandes Shopify et du site). */
export const orderRowKey = (o: Pick<Order, "id">) => (o.id.startsWith("gid://") ? o.id : `demo-${o.id}`);

/**
 * Consigne le passage d'une commande à une étape (la première date est gardée si l'étape est
 * consignée deux fois). Avec la base clientes, le statut y est recopié et le déclencheur date l'étape.
 */
export async function recordOrderStage(order: Pick<Order, "id">, stage: OrderStage, at: string = new Date().toISOString()): Promise<OrderStageDates> {
  const map = (await kv.get<StageMap>(ORDER_STAGES_KEY)) ?? {};
  const dates: OrderStageDates = { ...map[order.id], [stage]: map[order.id]?.[stage] ?? at };
  await kv.set(ORDER_STAGES_KEY, { ...map, [order.id]: dates });
  if (isSupabaseConfigured) {
    const patch: Record<string, unknown> = { status: stage };
    if (stage === "delivered") patch.delivered_at = at;
    const { error } = await supabaseAdmin().from("orders").update(patch).eq("shopify_order_id", orderRowKey(order));
    if (error) console.error("[étapes] base clientes", error.message);
  }
  return dates;
}

/** Délai annoncé d'une commande : le plus long de ses pièces (d'après le catalogue actuel). */
export async function orderLeadTime(lines: Pick<Order["lines"][number], "handle">[]): Promise<LeadTime | null> {
  const products = await getAllProducts().catch(() => []);
  return longestLeadTime(lines.flatMap((l) => products.find((p) => p.handle === l.handle)?.leadTime ?? []));
}

/** Commandes complétées de leurs dates d'étape et de leur délai annoncé. */
export async function withStages<T extends Order>(orders: T[]): Promise<T[]> {
  if (!orders.length) return orders;
  const [map, products] = await Promise.all([kv.get<StageMap>(ORDER_STAGES_KEY), orders.some((o) => !o.leadTime) ? getAllProducts().catch(() => []) : Promise.resolve([])]);
  return orders.map((o) => ({
    ...o,
    stages: { ...o.stages, ...map?.[o.id] },
    leadTime: o.leadTime ?? longestLeadTime(o.lines.flatMap((l) => products.find((p) => p.handle === l.handle)?.leadTime ?? [])) ?? undefined,
  }));
}

export async function withStage<T extends Order>(order: T): Promise<T> {
  return (await withStages([order]))[0];
}

/** Commande et sa frise, en un appel. */
export async function timelineOf<T extends Order>(order: T, now = new Date()): Promise<{ order: T; timeline: OrderTimeline }> {
  const full = await withStage(order);
  return { order: full, timeline: orderTimeline(full, now) };
}
