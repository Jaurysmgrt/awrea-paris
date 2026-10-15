/**
 * Événements temps réel transmis aux agents (sans attendre leur passage planifié).
 * Ici : une commande vient d'être passée → l'agent Commandes et stock vérifie les ruptures.
 */
import type { Order } from "@/lib/commerce/types";
import { getAllProducts } from "@/lib/commerce";
import { logAction } from "./log";

export async function onOrderCreated(order: Order) {
  await logAction({
    agent: "commandes-stock",
    kind: "commande",
    status: "info",
    summary: `Nouvelle commande ${order.number} : ${order.lines.map((l) => `${l.title} (${l.size})`).join(", ")}`,
    target: { type: "order", id: order.id, label: order.number },
  });
  const products = await getAllProducts();
  for (const line of order.lines) {
    const p = products.find((x) => x.handle === line.handle);
    const v = p?.variants.find((x) => x.size === line.size);
    if (p && v && v.quantity === 0) {
      await logAction({
        agent: "commandes-stock",
        kind: "rupture",
        status: "done",
        summary: `Rupture : ${p.title} en taille ${v.size}${v.preorder ? ", la taille passe automatiquement en précommande" : ", liste d’attente ouverte"}`,
        target: { type: "product", id: p.handle, label: p.title, href: `/boutique/${p.handle}` },
      });
    }
  }
}
