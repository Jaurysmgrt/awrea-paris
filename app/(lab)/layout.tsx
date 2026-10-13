import type { Metadata } from "next";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { Magnetic } from "@/components/motion/Magnetic";
import { CartProvider } from "@/components/commerce/CartProvider";
import { CartDrawerLazy } from "@/components/commerce/CartDrawerLazy";
import { WishlistProvider } from "@/components/commerce/WishlistProvider";

/**
 * Laboratoire de l'équipe Design (processus multi-agents, docs/EQUIPES.md) : chaque directeur
 * artistique y construit sa proposition d'accueil et de fiche produit, avec les vraies pièces et
 * les mêmes services que le site, mais sans l'en-tête ni le pied de page (à proposer lui-même).
 * Jamais indexé ; supprimé après la fusion (DESIGN.md).
 */
export const metadata: Metadata = { robots: { index: false, follow: false }, title: { absolute: "Laboratoire | Awrea Paris" } };

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <CartProvider>
        <WishlistProvider>
          <SmoothScroll>
            <main id="contenu" tabIndex={-1}>
              {children}
            </main>
            <CartDrawerLazy />
            <RevealObserver />
            <Magnetic />
          </SmoothScroll>
        </WishlistProvider>
      </CartProvider>
    </ConsentProvider>
  );
}
