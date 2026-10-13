import { segments as rules } from "@/content/settings";
import type { Segment } from "./types";

/** Nouvelles, fidèles, VIP — mêmes règles partout (tableau de bord, Cercle, lettres ciblées). */
export function segmentOf(ordersCount: number, totalSpent: number): Segment {
  if (totalSpent >= rules.vipMinSpent || ordersCount >= rules.vipMinOrders) return "vip";
  if (ordersCount >= rules.loyalMinOrders) return "fidele";
  return "nouvelle";
}

export const segmentLabel: Record<Segment, string> = { nouvelle: "Nouvelles", fidele: "Fidèles", vip: "VIP" };
