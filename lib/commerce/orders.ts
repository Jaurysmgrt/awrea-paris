/** Commandes : Shopify Admin en production, démonstration + commandes du tunnel de test sinon. */
import { demoOrders } from "@/data/demo/orders";
import { kv } from "@/lib/store";
import { adminEnabled, admin } from "@/lib/shopify/admin";
import type { Order, OrderStatus } from "./types";

export const ORDERS_KEY = "orders";
export const ORDER_STATUS_KEY = "orders:status"; // surcharges de statut (démo)
export const ORDER_DELIVERED_KEY = "orders:delivered"; // dates de livraison (démo)
export const ORDER_TRACKING_KEY = "orders:tracking"; // transporteur et numéro de suivi (démo)

export async function getOrders(): Promise<Order[]> {
  if (adminEnabled) {
    try {
      return await shopifyOrders();
    } catch (e) {
      console.error("[orders] Shopify indisponible :", e);
    }
  }
  const [created, overrides, delivered, tracking] = await Promise.all([
    kv.get<Order[]>(ORDERS_KEY),
    kv.get<Record<string, OrderStatus>>(ORDER_STATUS_KEY),
    kv.get<Record<string, string>>(ORDER_DELIVERED_KEY),
    kv.get<Record<string, { carrier: string; tracking: string }>>(ORDER_TRACKING_KEY),
  ]);
  return [...(created ?? []), ...demoOrders]
    .map((o) => ({ ...o, status: overrides?.[o.id] ?? o.status, deliveredAt: delivered?.[o.id] ?? o.deliveredAt, shipping: { ...o.shipping, ...(tracking?.[o.id] ?? {}) } }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(numberOrId: string): Promise<Order | null> {
  const n = numberOrId.trim().toUpperCase();
  return (await getOrders()).find((o) => o.number.toUpperCase() === n || o.id === numberOrId) ?? null;
}

export async function saveOrder(order: Order) {
  const list = (await kv.get<Order[]>(ORDERS_KEY)) ?? [];
  await kv.set(ORDERS_KEY, [order, ...list.filter((o) => o.id !== order.id)]);
}

/** Démonstration : transporteur et numéro de suivi saisis dans l'Atelier. */
export async function setOrderTracking(id: string, carrier: string, tracking: string) {
  const map = (await kv.get<Record<string, { carrier: string; tracking: string }>>(ORDER_TRACKING_KEY)) ?? {};
  await kv.set(ORDER_TRACKING_KEY, { ...map, [id]: { carrier, tracking } });
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  const map = (await kv.get<Record<string, OrderStatus>>(ORDER_STATUS_KEY)) ?? {};
  map[id] = status;
  await kv.set(ORDER_STATUS_KEY, map);
  if (status === "delivered") {
    const dates = (await kv.get<Record<string, string>>(ORDER_DELIVERED_KEY)) ?? {};
    await kv.set(ORDER_DELIVERED_KEY, { ...dates, [id]: dates[id] ?? new Date().toISOString() });
  }
}

async function shopifyOrders(): Promise<Order[]> {
  type N = {
    id: string; name: string; createdAt: string; email: string | null; displayFinancialStatus: string; displayFulfillmentStatus: string;
    customer: { displayName: string } | null; totalPriceSet: { shopMoney: { amount: string } };
    shippingLine: { title: string; originalPriceSet: { shopMoney: { amount: string } } } | null;
    shippingAddress: { countryCodeV2: string; firstName: string | null; lastName: string | null; address1: string | null; address2: string | null; zip: string | null; city: string | null; phone: string | null } | null;
    customAttributes: { key: string; value: string | null }[];
    totalTaxSet: { shopMoney: { amount: string } } | null;
    taxLines: { ratePercentage: number | null }[];
    currentTotalDutiesSet: { shopMoney: { amount: string } } | null;
    fulfillments: { trackingInfo: { number: string; company: string }[] }[];
    lineItems: { nodes: { title: string; quantity: number; variantTitle: string | null; originalUnitPriceSet: { shopMoney: { amount: string } }; product: { handle: string } | null }[] };
    paymentGatewayNames: string[];
  };
  const data = await admin<{ orders: { nodes: N[] } }>(`query { orders(first: 100, sortKey: CREATED_AT, reverse: true) { nodes {
    id name createdAt email displayFinancialStatus displayFulfillmentStatus paymentGatewayNames
    customer { displayName } totalPriceSet { shopMoney { amount } }
    shippingLine { title originalPriceSet { shopMoney { amount } } }
    shippingAddress { countryCodeV2 firstName lastName address1 address2 zip city phone }
    customAttributes { key value } totalTaxSet { shopMoney { amount } } taxLines { ratePercentage } currentTotalDutiesSet { shopMoney { amount } }
    fulfillments(first: 3) { trackingInfo { number company } }
    lineItems(first: 20) { nodes { title quantity variantTitle originalUnitPriceSet { shopMoney { amount } } product { handle } } }
  } } }`);
  const c = (a: string) => Math.round(parseFloat(a) * 100);
  return data.orders.nodes.map((o) => {
    const track = o.fulfillments[0]?.trackingInfo[0];
    const status: OrderStatus =
      o.displayFinancialStatus === "REFUNDED" ? "refunded" : o.displayFulfillmentStatus === "FULFILLED" ? (track ? "shipped" : "delivered") : o.displayFinancialStatus === "PAID" ? "paid" : "pending";
    return {
      id: o.id,
      number: o.name.replace("#", "AW-"),
      createdAt: o.createdAt,
      email: o.email ?? "",
      name: o.customer?.displayName ?? "",
      status,
      lines: o.lineItems.nodes.map((l) => ({ title: l.title, size: (l.variantTitle ?? "TU") as Order["lines"][number]["size"], quantity: l.quantity, unitPrice: c(l.originalUnitPriceSet.shopMoney.amount), handle: l.product?.handle ?? "" })),
      total: c(o.totalPriceSet.shopMoney.amount),
      shipping: { method: o.shippingLine?.title ?? "", price: c(o.shippingLine?.originalPriceSet.shopMoney.amount ?? "0"), country: o.shippingAddress?.countryCodeV2 ?? "", tracking: track?.number, carrier: track?.company },
      address: o.shippingAddress?.address1
        ? {
            firstName: o.shippingAddress.firstName ?? "",
            lastName: o.shippingAddress.lastName ?? "",
            line1: o.shippingAddress.address1,
            line2: o.shippingAddress.address2 ?? undefined,
            postalCode: o.shippingAddress.zip ?? "",
            city: o.shippingAddress.city ?? "",
            country: o.shippingAddress.countryCodeV2,
            phone: o.shippingAddress.phone ?? undefined,
          }
        : undefined,
      gift: attr(o, "Emballage cadeau") === "Oui"
        ? { wrap: true, message: attr(o, "Message cadeau"), hidePrices: attr(o, "Prix masqués") !== "Non", deliveryDate: attr(o, "Livraison souhaitée le") || null }
        : undefined,
      taxes: { vatRate: (o.taxLines[0]?.ratePercentage ?? 0) / 100, vat: c(o.totalTaxSet?.shopMoney.amount ?? "0"), ...(o.currentTotalDutiesSet ? { duties: c(o.currentTotalDutiesSet.shopMoney.amount) } : {}) },
      paymentMethod: o.paymentGatewayNames.join(", "),
    };
  });
}

const attr = (o: { customAttributes: { key: string; value: string | null }[] }, key: string) => o.customAttributes.find((a) => a.key === key)?.value ?? "";

export const statusLabel: Record<OrderStatus, string> = {
  pending: "En attente de paiement",
  paid: "Confirmée, en préparation",
  in_production: "En fabrication à l’atelier",
  shipped: "Expédiée",
  delivered: "Livrée",
  returned: "Retour en cours",
  refunded: "Remboursée",
  blocked: "En attente, l’atelier vous contacte",
};

export function trackingUrl(carrier?: string, number?: string): string | null {
  if (!number) return null;
  if (carrier?.toLowerCase().includes("dhl")) return `https://www.dhl.com/fr-fr/home/suivi.html?tracking-id=${number}`;
  if (carrier?.toLowerCase().includes("chrono")) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${number}`;
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${number}`;
}
