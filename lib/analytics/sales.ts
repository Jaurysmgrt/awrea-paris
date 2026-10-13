/** Ventes par canal d'origine (tableau « ventes par source » de l'Atelier). */
import "server-only";
import { getOrders } from "@/lib/commerce/orders";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  "meta-ads": "Publicité Meta (Instagram, Facebook)",
  google: "Google (naturel)",
  "google-ads": "Google Ads",
  "google-shopping": "Google Shopping",
  newsletter: "Lettres de l’atelier",
  direct: "Accès direct",
  pinterest: "Pinterest",
  tiktok: "TikTok",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  bing: "Bing",
  "non-renseignee": "Non renseignée",
};

export async function salesBySource(days = 90) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  let rows: { source: string | null; total: number; status: string; at: string }[];
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("orders").select("source, total, status, placed_at").gte("placed_at", new Date(since).toISOString()).limit(10000);
    rows = (data ?? []).map((r: { source: string | null; total: number; status: string; placed_at: string }) => ({ source: r.source, total: r.total, status: r.status, at: r.placed_at }));
  } else {
    rows = (await getOrders()).map((o) => ({ source: o.source ?? null, total: o.total, status: o.status, at: o.createdAt }));
  }
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const r of rows) {
    if (new Date(r.at).getTime() < since || r.status === "refunded" || r.status === "pending") continue;
    const key = r.source || "non-renseignee";
    const cur = map.get(key) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    cur.revenue += r.total;
    map.set(key, cur);
  }
  return [...map.entries()].map(([source, v]) => ({ source, label: LABELS[source] ?? source, ...v })).sort((a, b) => b.revenue - a.revenue);
}
