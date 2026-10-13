"use client";
/**
 * Le panier latéral n'est téléchargé qu'à la première ouverture (ou quand le navigateur
 * est inactif) : il ne pèse pas sur l'affichage initial des pages.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

const loadDrawer = () => import("./CartDrawer").then((m) => m.CartDrawer);
const CartDrawer = dynamic(loadDrawer, { ssr: false });

export function CartDrawerLazy() {
  const { isOpen } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => void loadDrawer(), { timeout: 6000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => void loadDrawer(), 4000);
    return () => window.clearTimeout(t);
  }, []);

  return mounted ? <CartDrawer /> : null;
}
