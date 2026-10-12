import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { identity } from "@/content/brand/identity";
import { siteUrl } from "@/lib/seo/metadata";
import { palette } from "@/styles/tokens";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ color: palette.ink }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
      </head>
      <body>{children}</body>
    </html>
  );
}
