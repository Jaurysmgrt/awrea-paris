/**
 * Canal d'origine d'une visite (pour le tableau « ventes par source » de l'Atelier).
 * N'est enregistré qu'avec le consentement « mesure d'audience », pour la durée de la visite
 * (stockage de session), puis joint à la commande.
 */
const KEY = "awrea_src";

const HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/, "instagram"],
  [/(^|\.)facebook\.com$|^l\.facebook\.com$|(^|\.)fb\.com$/, "facebook"],
  [/(^|\.)pinterest\./, "pinterest"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "chatgpt"],
  [/(^|\.)perplexity\.ai$/, "perplexity"],
  [/(^|\.)claude\.ai$/, "claude"],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "x"],
];

export function classifySource(url: URL, referrer: string): string {
  const p = url.searchParams;
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) return "google-ads";
  if (p.get("fbclid") && p.get("utm_medium")?.includes("paid")) return "meta-ads";
  const utm = p.get("utm_source")?.toLowerCase().trim();
  if (utm) {
    const medium = p.get("utm_medium")?.toLowerCase() ?? "";
    const base = utm.replace(/[^a-z0-9-]/g, "").slice(0, 30);
    if (base === "ig") return medium.includes("paid") || medium === "cpc" ? "meta-ads" : "instagram";
    return medium.includes("paid") || medium === "cpc" ? `${base}-ads` : base;
  }
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === url.hostname.replace(/^www\./, "")) return "direct";
    for (const [re, name] of HOSTS) if (re.test(host)) return name;
    return host.slice(0, 40);
  } catch {
    return "direct";
  }
}

/** À appeler une fois l'audience acceptée : mémorise le canal de la première page de la visite. */
export function captureSource() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, classifySource(new URL(window.location.href), document.referrer));
  } catch {
    /* stockage indisponible */
  }
}

export function readSource(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
