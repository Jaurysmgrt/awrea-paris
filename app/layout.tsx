import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { fontVariables } from "./fonts";
import { identity } from "@/content/brand/identity";
import { siteDefaults, siteUrl } from "@/lib/seo/metadata";
import { palette } from "@/styles/tokens";
import { consentHeadScript } from "@/lib/consent";
import { prefsHeadScript } from "@/lib/prefs";
import { cspEnabled, cspMode } from "@/lib/security/headers";
import { TextsRoot } from "@/components/content/TextsRoot";
import { EditionRoot } from "@/components/edition/EditionRoot";
import { ErrorReporter } from "@/components/analytics/ErrorReporter";
import { HydrationMark } from "@/components/layout/HydrationMark";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { getLocale } from "@/lib/i18n/server";
import { HTML_LANG, LOCALES, OG_LOCALE } from "@/lib/i18n/routing";
import "./globals.css";

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteDefaults.title, template: `%s | ${identity.name}` },
  description: siteDefaults.description,
  applicationName: identity.name,
  authors: [{ name: identity.name, url: siteUrl }],
  creator: identity.name,
  publisher: identity.name,
  keywords: [...identity.keywords],
  formatDetection: { telephone: false, email: false, address: false },
  other: { "theme-color": palette.ink },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  alternates: { types: { "text/plain": "/llms.txt" } },
  // partage des pages sans métadonnées propres : titre et description de la page, image par défaut
  // app/opengraph-image.png (logo officiel, polices officielles) ; X reprend l'image Open Graph
  openGraph: { type: "website", siteName: identity.name, locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
};

/** Langue des partages selon la version de la page (anglais sous /en). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata.openGraph, locale: OG_LOCALE[locale], alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]) },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ color: palette.ink }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP stricte : le script de <head> porte le nonce de la page (posé par proxy.ts)
  const nonce = cspEnabled && cspMode === "strict" ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  // langue de la page (proxy.ts) : anglais sous /en, français partout ailleurs
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]} className={fontVariables} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: consentHeadScript() + prefsHeadScript() }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          {/* textes des composants interactifs montés partout (lus dans content/site, modifiables dans l'éditeur) */}
          <TextsRoot ids={["site", "commerce", "catalogue"]}>{children}</TextsRoot>
          <ErrorReporter />
          <HydrationMark />
          {/* éditeur visuel : rendu pour la créatrice connectée en mode Édition seulement */}
          <EditionRoot />
        </LocaleProvider>
      </body>
    </html>
  );
}
