import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { DrapeTransition } from "@/components/signature/DrapeTransition";
import { ThemeShift } from "@/components/signature/ThemeShift";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { Magnetic } from "@/components/motion/Magnetic";
import { CartProvider } from "@/components/commerce/CartProvider";
import { CartDrawerLazy } from "@/components/commerce/CartDrawerLazy";
import { WishlistProvider } from "@/components/commerce/WishlistProvider";
import { Assistant } from "@/components/assistant/Assistant";
import { JsonLd } from "@/components/seo/JsonLd";
import { Trackers } from "@/components/analytics/Trackers";
import { Suspense } from "react";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { getDoc } from "@/lib/edition/read";

type SiteTexts = typeof import("@/content/site/fr/site.json");

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await getDoc<SiteTexts>("site");
  return (
    <ConsentProvider>
      <CartProvider>
        <WishlistProvider>
          <SmoothScroll>
            <DrapeTransition>
              <a href="#contenu" className="skip-link">
                {site.evitement}
              </a>
              <Header />
              <main id="contenu" tabIndex={-1}>
                {children}
              </main>
              <Footer />
              <CartDrawerLazy />
              <Assistant />
              <ThemeShift />
              <RevealObserver />
              <Magnetic />
              <Suspense fallback={null}>
                <Trackers />
              </Suspense>
              <JsonLd data={[organizationSchema(), websiteSchema()]} />
            </DrapeTransition>
          </SmoothScroll>
        </WishlistProvider>
      </CartProvider>
    </ConsentProvider>
  );
}
