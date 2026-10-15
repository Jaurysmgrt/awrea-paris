/**
 * En-têtes de sécurité HTTP.
 *
 * Politique de sécurité du contenu (CSP) — deux modes, choisis par CSP_MODE :
 *  - « strict » (par défaut) : chaque page reçoit un nonce unique (proxy.ts) ; seuls les scripts
 *    portant ce nonce s'exécutent, et ceux qu'ils chargent eux-mêmes (« strict-dynamic » : mesure
 *    d'audience, Turnstile…). Aucun « unsafe-inline » pour les scripts. Les pages sont alors
 *    rendues à chaque visite (les données Shopify restent en cache 5 minutes).
 *  - « static » : pages servies depuis le cache du CDN ; les scripts en ligne de Next.js imposent
 *    alors « unsafe-inline » pour les scripts. Plus rapide, un peu moins strict.
 * Dans les deux cas, seuls les domaines réellement utilisés sont autorisés, et le reste est
 * verrouillé (objets, cadres, formulaires, balise <base>, intégration dans un autre site).
 */
export type CspMode = "strict" | "static";
export const cspMode: CspMode = process.env.CSP_MODE === "static" ? "static" : "strict";

/** La CSP ne s'applique qu'aux versions compilées : le serveur de développement a besoin d'« eval ». */
export const cspEnabled = process.env.NODE_ENV === "production";

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";
const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC).origin : "https://plausible.io";

/** Scripts tiers chargés à la demande (après consentement pour la mesure et la publicité). */
const scriptHosts = [
  "https://challenges.cloudflare.com",
  plausible,
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://www.clarity.ms",
  "https://scripts.clarity.ms",
  "https://analytics.tiktok.com",
];

/** Site servi en HTTPS (Vercel, production ou prévisualisation) : forçage du HTTPS. */
const https = process.env.VERCEL === "1" || process.env.FORCE_HTTPS === "1";

function directives(nonce?: string, selfFrame = false): Record<string, string[]> {
  return {
    "default-src": ["'self'"],
    // avec un nonce, « strict-dynamic » fait foi pour les navigateurs récents ; la liste des
    // domaines ne sert plus qu'aux navigateurs anciens
    "script-src": nonce ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...scriptHosts] : ["'self'", "'unsafe-inline'", ...scriptHosts],
    // les attributs style (variables CSS des animations) restent autorisés : ils n'exécutent aucun code
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://cdn.shopify.com",
      "https://www.facebook.com",
      "https://www.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://googleads.g.doubleclick.net",
      "https://www.google.com",
      "https://www.google.fr",
      "https://*.clarity.ms",
      "https://c.bing.com",
      "https://analytics.tiktok.com",
    ],
    "font-src": ["'self'"],
    "media-src": ["'self'", "blob:", "https://cdn.shopify.com"],
    "connect-src": [
      "'self'",
      supabase,
      supabase.replace("https://", "wss://"),
      plausible,
      "https://challenges.cloudflare.com",
      "https://www.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
      "https://connect.facebook.net",
      "https://www.facebook.com",
      "https://googleads.g.doubleclick.net",
      "https://*.clarity.ms",
      "https://analytics.tiktok.com",
    ],
    // l'éditeur de la créatrice affiche l'aperçu de la page dans un cadre du site lui-même
    "frame-src": [...(selfFrame ? ["'self'"] : []), "https://challenges.cloudflare.com", "https://www.googletagmanager.com", "https://td.doubleclick.net"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": [selfFrame ? "'self'" : "'none'"],
  };
}

export function contentSecurityPolicy(nonce?: string, opts: { selfFrame?: boolean } = {}): string {
  return [...Object.entries(directives(nonce, opts.selfFrame)).map(([k, v]) => `${k} ${v.join(" ")}`), ...(https ? ["upgrade-insecure-requests"] : [])].join("; ");
}

/** Nonce imprévisible, nouveau à chaque page servie. */
export function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * En-têtes appliqués par next.config.ts à toutes les réponses. En mode « strict », la CSP est
 * posée page par page par proxy.ts (elle contient le nonce de la page).
 */
export const securityHeaders = [
  ...(cspEnabled && cspMode === "static" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }] : []),
  ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];
