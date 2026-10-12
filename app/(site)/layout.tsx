import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentProvider } from "@/components/layout/CookieBanner";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { DrapeTransition } from "@/components/signature/DrapeTransition";
import { ThemeShift } from "@/components/signature/ThemeShift";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { CartProvider } from "@/components/commerce/CartProvider";
import { CartDrawer } from "@/components/commerce/CartDrawer";
import { WishlistProvider } from "@/components/commerce/WishlistProvider";
import { Assistant } from "@/components/assistant/Assistant";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <CartProvider>
        <WishlistProvider>
          <SmoothScroll>
            <DrapeTransition>
              <a href="#contenu" className="skip-link">
                Aller au contenu
              </a>
              <Header />
              <main id="contenu" tabIndex={-1}>
                {children}
              </main>
              <Footer />
              <CartDrawer />
              <Assistant />
              <ThemeShift />
              <RevealObserver />
              <JsonLd data={[organizationSchema(), websiteSchema()]} />
            </DrapeTransition>
          </SmoothScroll>
        </WishlistProvider>
      </CartProvider>
    </ConsentProvider>
  );
}
