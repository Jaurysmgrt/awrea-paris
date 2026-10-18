/**
 * Événements temps réel transmis aux agents (sans attendre leur passage planifié).
 * Ici : une commande vient d'être passée → elle est consignée pour l'agent Commandes. Les pièces
 * sont créées sur demande, sans stock : il n'y a aucune rupture à surveiller.
 */
import type { Order } from "@/lib/commerce/types";
import { logAction } from "./log";

export async function onOrderCreated(order: Order) {
  await logAction({
    agent: "commandes-stock",
    kind: "commande",
    status: "info",
    summary: `Nouvelle commande ${order.number} : ${order.lines.map((l) => `${l.title} (${l.size})`).join(", ")}`,
    target: { type: "order", id: order.id, label: order.number },
  });
}
