/**
 * Mesure d'audience minimale et respectueuse : vues de fiches produit agrégées par semaine
 * (sans cookie, avec consentement), paniers abandonnés (Shopify ou démonstration).
 */
import { kv } from "@/lib/store";
import { demoAnalytics } from "@/data/demo/orders";
import { adminEnabled, shopifyAbandonedCheckouts } from "@/lib/shopify/admin";

export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-S${String(week).padStart(2, "0")}`;
}

export async function recordView(handle: string) {
  const key = `views:${weekKey()}`;
  const map = (await kv.get<Record<string, number>>(key)) ?? {};
  map[handle] = (map[handle] ?? 0) + 1;
  map.__sessions = (map.__sessions ?? 0) + 1;
  await kv.set(key, map);
}

export async function getAnalytics() {
  const map = (await kv.get<Record<string, number>>(`views:${weekKey()}`)) ?? {};
  const measured = Object.entries(map)
    .filter(([k]) => k !== "__sessions")
    .map(([handle, views]) => ({ handle, views }))
    .sort((a, b) => b.views - a.views);
  const abandoned = adminEnabled ? await shopifyAbandonedCheckouts().catch(() => demoAnalytics.abandonedCarts) : demoAnalytics.abandonedCarts;
  const hasData = measured.length >= 3;
  return {
    source: hasData ? "mesure" : "démonstration",
    sessions: hasData ? map.__sessions ?? 0 : demoAnalytics.sessions,
    productViews: hasData ? measured : demoAnalytics.productViews,
    abandonedCarts: abandoned,
    topSources: demoAnalytics.topSources,
  };
}
