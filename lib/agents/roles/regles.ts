/** Règles des rôles, sans accès aux données (testées dans tests/unit/roles.test.ts). Module pur. */
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/commerce/types";

const HOUR = 3_600_000;
/** seuil annuel des ventes à distance vers les autres pays de l'Union, en centimes */
export const OSS_THRESHOLD = 1_000_000;
export const zoneOf = (code: string) => shop.countries.find((c) => c.code === code)?.zone ?? "WORLD";

/** Raisons de regarder une commande de plus près (règles simples, expliquées). */
export function suspicion(o: Order, all: Order[]): string[] {
  const reasons: string[] = [];
  const mine = all.filter((x) => x.email.toLowerCase() === o.email.toLowerCase());
  const earlier = mine.filter((x) => x.createdAt < o.createdAt && x.status !== "refunded");
  if (!earlier.length && o.total >= 150_000) reasons.push(`première commande de ${formatPrice(o.total)}`);
  const sameDay = mine.filter((x) => Math.abs(new Date(x.createdAt).getTime() - new Date(o.createdAt).getTime()) < 24 * HOUR);
  if (sameDay.length >= 3) reasons.push(`${sameDay.length} commandes de la même adresse en 24 heures`);
  if (zoneOf(o.shipping.country) === "WORLD" && o.total >= 100_000 && !earlier.length) reasons.push(`livraison hors de l’Union pour ${formatPrice(o.total)}, sans commande précédente`);
  if (o.address && o.address.country && o.address.country !== o.shipping.country) reasons.push("pays de l’adresse différent du pays de livraison");
  return reasons;
}

