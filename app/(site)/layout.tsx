import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PageTransition } from "@/components/signature/PageTransition";
import { CartProvider } from "@/components/commerce/CartProvider";
import { CartDrawerLazy } from "@/components/commerce/CartDrawerLazy";
import { WishlistProvider } from "@/components/commerce/WishlistProvider";
import { Assistant } from "@/components/assistant/Assistant";
import { JsonLd } from "@/components/seo/JsonLd";
import { Trackers } from "@/components/analytics/Trackers";
import { Suspense } from "react";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { getDoc, isEditing } from "@/lib/edition/read";
import { Justification } from "@/components/ui/Justification";

type SiteTexts = typeof import("@/content/site/fr/site.json");

/**
 * Gabarit du site public. Animations au strict minimum (choix de la créatrice du 01/11 : « ça fait
 * kitsch et vu et revu ») : plus d'apparitions au défilement, de fond qui glisse d'une couleur à
 * l'autre ni de boutons attirés par le curseur. Restent le fondu blanc entre les pages
 * (PageTransition), la sortie du film d'ouverture de l'accueil et des survols discrets.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, editing] = await Promise.all([getDoc<SiteTexts>("site"), isEditing()]);
  return (
    <ConsentProvider>
      <CartProvider>
        <WishlistProvider>
          <SmoothScroll>
            <PageTransition>
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
              <Justification active={!editing} />
              <Suspense fallback={null}>
                <Trackers />
              </Suspense>
              <JsonLd data={[organizationSchema(), websiteSchema()]} />
            </PageTransition>
          </SmoothScroll>
        </WishlistProvider>
      </CartProvider>
    </ConsentProvider>
  );
}
