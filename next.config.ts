import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";
import { providerOf } from "./lib/config/providers";

/**
 * Une seule version du site : l'hôte de NEXT_PUBLIC_SITE_URL fait foi ; l'autre (avec ou sans
 * « www ») y est redirigée de façon permanente. Le passage de http à https est assuré par Vercel.
 */
const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.awreaparis.com");
const alternateHost = canonical.hostname.startsWith("www.") ? canonical.hostname.slice(4) : `www.${canonical.hostname}`;

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // interrupteur de la protection anti-robots, connu du navigateur (lib/config/providers.ts)
  env: { AWREA_CAPTCHA: providerOf("captcha") },
  // la référence de ton est lue à l'exécution par l'assistante et les agents
  outputFileTracingIncludes: {
    // documents de contenu (content/site), relus à chaque publication de l’éditeur
    "/**": ["./content/brand/voice.md", "./content/site/**/*.json"],
    // polices officielles des factures et étiquettes PDF (Fraunces 72pt Italic et Cormorant
    // Garamond en TTF, assets/pdf) et logo officiel, lus sur le disque par pdf-lib
    "/api/factures/**": ["./assets/pdf/**", "./public/brand/awrea-logo.png"],
    "/api/gestion/**": ["./assets/pdf/**", "./public/brand/awrea-logo.png"],
    "/api/checkout": ["./assets/pdf/**", "./public/brand/awrea-logo.png"],
    "/api/retours/**": ["./assets/pdf/**", "./public/brand/awrea-logo.png"],
    "/api/cron/**": ["./assets/pdf/**", "./public/brand/awrea-logo.png"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
    ],
  },
  async redirects() {
    return [
      // ancienne page « Silhouettes », devenue « Outfits » (rubrique Instagram de la Maison)
      { source: "/silhouettes", destination: "/outfits", permanent: true },
      // collection « Lace is more », devenue « Hypnotic Lace » (ressources officielles de la Maison)
      { source: "/collections/lace-is-more", destination: "/collections/hypnotic-lace", permanent: true },
      // collection et pièces retirées du catalogue : vers la liste des collections et la boutique
      { source: "/collections/lumiere-d-or", destination: "/collections", permanent: true },
      ...["robe-thais", "jupe-iris", "corset-elia", "etole-nyx"].map((handle) => ({ source: `/boutique/${handle}`, destination: "/boutique", permanent: true })),
      // articles du Journal retirés (ancienne collection, shooting et conseils d'entretien non confirmés)
      ...["moodboard-lace-is-more", "coulisses-shooting-studio-blanc", "comment-entretenir-la-dentelle"].map((slug) => ({ source: `/journal/${slug}`, destination: "/journal", permanent: true })),
      {
        source: "/:path*",
        has: [{ type: "host", value: alternateHost }],
        destination: `${canonical.origin}/:path*`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default config;
