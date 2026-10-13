import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { fontVariables } from "./fonts";
import { identity } from "@/content/brand/identity";
import { siteUrl } from "@/lib/seo/metadata";
import { palette } from "@/styles/tokens";
import { consentHeadScript } from "@/lib/consent";
import { prefsHeadScript } from "@/lib/prefs";
import { cspEnabled, cspMode } from "@/lib/security/headers";
import { Justification } from "@/components/typography/Justification";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${identity.name} — prêt-à-porter féminin fait main à Paris`, template: `%s | ${identity.name}` },
  description: identity.shortDescription,
  applicationName: identity.name,
  authors: [{ name: identity.name, url: siteUrl }],
  creator: identity.name,
  publisher: identity.name,
  keywords: [...identity.keywords],
  formatDetection: { telephone: false, email: false, address: false },
  other: { "theme-color": palette.ink },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  alternates: { types: { "text/plain": "/llms.txt" } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ color: palette.ink }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP stricte : le script de <head> porte le nonce de la page (posé par proxy.ts)
  const nonce = cspEnabled && cspMode === "strict" ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  return (
    <html lang="fr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: consentHeadScript() + prefsHeadScript() }} />
      </head>
      <body>
        {children}
        <Justification />
      </body>
    </html>
  );
}
