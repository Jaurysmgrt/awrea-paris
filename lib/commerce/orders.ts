/**
 * Commandes de la boutique de la Maison, tenues dans sa propre base (stockage du site). En
 * démonstration (lib/config/boutique.ts), des commandes d'exemple s'y ajoutent, jamais sur la
 * boutique réelle : aucun exemple n'est présenté comme une vraie commande.
 */
import { demoOrders } from "@/data/demo/orders";
import { kv } from "@/lib/store";
import { boutiqueReelle } from "@/lib/config/boutique";
import type { Order, OrderStatus } from "./types";

export const ORDERS_KEY = "orders";
export const ORDER_STATUS_KEY = "orders:status"; // étape de chaque commande
export const ORDER_DELIVERED_KEY = "orders:delivered"; // dates de livraison
export const ORDER_TRACKING_KEY = "orders:tracking"; // transporteur et numéro de suivi

export async function getOrders(): Promise<Order[]> {
  return (await getOrdersWithSource()).orders;
}

/**
 * Les commandes, et d'où elles viennent : « boutique » sur la boutique réelle, « demo » en
 * démonstration (commandes d'exemple comprises). La Vue d'ensemble le dit à la créatrice.
 */
export async function getOrdersWithSource(): Promise<{ orders: Order[]; source: "boutique" | "demo" }> {
  const reelle = boutiqueReelle();
  const [created, overrides, delivered, tracking] = await Promise.all([
    kv.get<Order[]>(ORDERS_KEY),
    kv.get<Record<string, OrderStatus>>(ORDER_STATUS_KEY),
    kv.get<Record<string, string>>(ORDER_DELIVERED_KEY),
    kv.get<Record<string, { carrier: string; tracking: string }>>(ORDER_TRACKING_KEY),
  ]);
  const orders = [...(created ?? []), ...(reelle ? [] : demoOrders)]
    .map((o) => ({ ...o, status: overrides?.[o.id] ?? o.status, deliveredAt: delivered?.[o.id] ?? o.deliveredAt, shipping: { ...o.shipping, ...(tracking?.[o.id] ?? {}) } }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { orders, source: reelle ? "boutique" : "demo" };
}

export async function getOrder(numberOrId: string): Promise<Order | null> {
  const n = numberOrId.trim().toUpperCase();
  return (await getOrders()).find((o) => o.number.toUpperCase() === n || o.id === numberOrId) ?? null;
}

export async function saveOrder(order: Order) {
  const list = (await kv.get<Order[]>(ORDERS_KEY)) ?? [];
  await kv.set(ORDERS_KEY, [order, ...list.filter((o) => o.id !== order.id)]);
}

/** Transporteur et numéro de suivi saisis dans l'Atelier. */
export async function setOrderTracking(id: string, carrier: string, tracking: string) {
  const map = (await kv.get<Record<string, { carrier: string; tracking: string }>>(ORDER_TRACKING_KEY)) ?? {};
  await kv.set(ORDER_TRACKING_KEY, { ...map, [id]: { carrier, tracking } });
}

/** Étape d'une commande, réglée depuis l'Atelier (ou par un agent, après validation). */
export async function setOrderStatus(id: string, status: OrderStatus) {
  const map = (await kv.get<Record<string, OrderStatus>>(ORDER_STATUS_KEY)) ?? {};
  map[id] = status;
  await kv.set(ORDER_STATUS_KEY, map);
  if (status === "delivered") {
    const dates = (await kv.get<Record<string, string>>(ORDER_DELIVERED_KEY)) ?? {};
    await kv.set(ORDER_DELIVERED_KEY, { ...dates, [id]: dates[id] ?? new Date().toISOString() });
  }
}

/** Étapes de la commande : reçue, en confection, prête, expédiée, livrée. */
export const statusLabel: Record<OrderStatus, string> = {
  pending: "En attente de paiement",
  paid: "Commande reçue",
  in_production: "En confection",
  ready: "Prête",
  shipped: "Expédiée",
  delivered: "Livrée",
  returned: "Retour en cours",
  refunded: "Remboursée",
  blocked: "En attente, la Maison vous contacte",
};

export function trackingUrl(carrier?: string, number?: string): string | null {
  if (!number) return null;
  if (carrier?.toLowerCase().includes("dhl")) return `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${number}`;
  if (carrier?.toLowerCase().includes("chrono")) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${number}`;
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${number}`;
}
