/**
 * En-têtes de sécurité HTTP (appliqués par next.config.ts à toutes les réponses).
 * La politique de sécurité du contenu (CSP) n'autorise que les domaines réellement utilisés :
 * Shopify (images, vidéos), Supabase, et — seulement après consentement, chargés à la demande —
 * Plausible ou Google Analytics, Meta Pixel, Google Ads ; Cloudflare Turnstile pour les formulaires.
 * Les scripts en ligne de Next.js imposent « unsafe-inline » pour les scripts (pages statiques,
 * sans nonce) ; le reste est verrouillé (objets, cadres, formulaires, base, ancêtres).
 */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "https://*.supabase.co";
const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC).origin : "https://plausible.io";

const directives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://challenges.cloudflare.com",
    plausible,
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
  ],
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
  ],
  "frame-src": ["https://challenges.cloudflare.com", "https://www.googletagmanager.com", "https://td.doubleclick.net"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

/** Site servi en HTTPS (Vercel, production ou prévisualisation) : forçage du HTTPS. */
const https = process.env.VERCEL === "1" || process.env.FORCE_HTTPS === "1";

export const contentSecurityPolicy = [...Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`), ...(https ? ["upgrade-insecure-requests"] : [])].join("; ");

/**
 * La CSP n'est appliquée qu'aux versions compilées : le serveur de développement de Next.js
 * a besoin d'« eval » pour le rechargement à chaud.
 */
export const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
  ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];
