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
  outputFileTracingIncludes: { "/**": ["./content/brand/voice.md"] },
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
