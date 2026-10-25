/**
 * Étape d'une commande Shopify : module pur (sans accès à Shopify ni au stockage), partagé par la
 * lecture des commandes (lib/commerce/orders.ts) et le webhook, et couvert par les tests unitaires.
 */
import type { OrderStatus } from "./types";

/**
 * Étiquettes de commande posées dans Shopify par la Maison pour suivre la confection
 * (ACTIVATION.md, étape 4.2) : « en-confection » puis « prete ». Sans étiquette, une commande payée
 * est « reçue » ; l'expédition et la livraison viennent du traitement Shopify.
 */
export const SHOPIFY_STAGE_TAGS = { inProduction: "en-confection", ready: "prete" } as const;

/** Étiquettes comparées sans majuscules ni accents : « Prête » vaut « prete ». */
const tagSet = (tags: string[] | string) =>
  new Set((Array.isArray(tags) ? tags : tags.split(",")).map((t) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")));

/** Étape d'une commande Shopify (Admin GraphQL en minuscules, ou webhook REST). */
export function shopifyStatus(o: { cancelled: boolean; financial: string | null; fulfillment: string | null; tracked: boolean; tags: string[] | string }): OrderStatus {
  const financial = (o.financial ?? "").toLowerCase();
  const fulfillment = (o.fulfillment ?? "").toLowerCase();
  if (o.cancelled || financial === "refunded") return "refunded";
  if (fulfillment === "fulfilled") return o.tracked ? "shipped" : "delivered";
  if (!["paid", "partially_paid", "partially_refunded"].includes(financial)) return "pending";
  const tags = tagSet(o.tags);
  if (tags.has(SHOPIFY_STAGE_TAGS.ready)) return "ready";
  if (tags.has(SHOPIFY_STAGE_TAGS.inProduction)) return "in_production";
  return "paid";
}
