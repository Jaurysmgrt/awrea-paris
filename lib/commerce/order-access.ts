/**
 * Accès d'une cliente à SA commande sans compte : un lien signé (numéro de commande et empreinte
 * de l'e-mail), valable un peu plus d'un an. Il ouvre le suivi, les retours et la facture.
 * Obtenu en donnant le numéro et l'e-mail de la commande (page « Suivre une commande »), ou dans
 * les e-mails de la commande.
 */
import "server-only";
import { createHash } from "node:crypto";
import { sign, verify } from "@/lib/auth/session";
import { getOrder } from "./orders";
import type { Order } from "./types";

const hash = (email: string) => createHash("sha256").update(`commande:${email.trim().toLowerCase()}`).digest("hex").slice(0, 16);

export function orderAccessToken(order: Pick<Order, "number" | "email">): string {
  return sign({ n: order.number, e: hash(order.email) }, 400 * 86_400);
}

export async function orderFromAccess(number: string, token: string | null | undefined): Promise<Order | null> {
  const t = verify<{ n: string; e: string }>(token);
  if (!t || t.n.toUpperCase() !== number.toUpperCase()) return null;
  const order = await getOrder(t.n);
  return order && hash(order.email) === t.e ? order : null;
}

/** Numéro et e-mail donnés par la cliente : la commande, si les deux correspondent. */
export async function findOrderFor(number: string, email: string): Promise<Order | null> {
  const order = await getOrder(number.trim().replace(/^#/, "").replace(/^(\d+)$/, "AW-$1"));
  return order && order.email.trim().toLowerCase() === email.trim().toLowerCase() ? order : null;
}

export const orderLink = (order: Pick<Order, "number" | "email">) => `/suivi/${encodeURIComponent(order.number)}?t=${encodeURIComponent(orderAccessToken(order))}`;
