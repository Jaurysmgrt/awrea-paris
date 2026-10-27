"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Cart } from "@/lib/commerce/types";
import type { CartAction } from "@/lib/commerce/cart";
import { track } from "@/lib/analytics/track";
import { prefersReducedMotion } from "@/lib/motion";
import { useTexts } from "@/components/content/Texts";
import type { CommerceTexts } from "@/lib/commerce/texts";

/** Retour haptique discret sur mobile (ajout au panier), absent si l'appareil ne le permet pas. */
function haptic() {
  try {
    if (!prefersReducedMotion()) navigator.vibrate?.(12);
  } catch {
    /* non pris en charge */
  }
}

type CartCtx = {
  cart: Cart | null;
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  announce: string;
  /** dernier ajout (variante et instant) : le panier amène cette pièce à l'écran, une fois */
  lastAdded: { variantId: string; at: number } | null;
  open: () => void;
  close: () => void;
  dispatch: (action: CartAction, opts?: { openAfter?: boolean; announce?: string }) => Promise<boolean>;
};

const Ctx = createContext<CartCtx | null>(null);

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart hors de CartProvider");
  return c;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [lastAdded, setLastAdded] = useState<CartCtx["lastAdded"]>(null);
  const erreur = useTexts<CommerceTexts>("commerce").panier.erreur;

  useEffect(() => {
    fetch("/api/cart", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCart(j.cart))
      .catch(() => {});
  }, []);

  const dispatch = useCallback<CartCtx["dispatch"]>(async (action, opts) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? erreur);
      setCart(json.cart);
      if (action.type === "add" || action.type === "addMany") {
        haptic();
        const ids = action.type === "add" ? [action.variantId] : action.variantIds;
        setLastAdded(ids.length ? { variantId: ids[ids.length - 1], at: Date.now() } : null);
        for (const l of (json.cart as Cart).lines.filter((x) => ids.includes(x.variantId))) {
          track({ name: "add_to_cart", handle: l.productHandle, title: l.title, price: l.unitPrice, size: l.size });
        }
      }
      if (opts?.announce) setAnnounce(opts.announce);
      if (opts?.openAfter) setOpen(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : erreur);
      if (opts?.openAfter) setOpen(true);
      return false;
    } finally {
      setBusy(false);
    }
  }, [erreur]);

  const value = useMemo(
    () => ({ cart, isOpen, busy, error, announce, lastAdded, open: () => setOpen(true), close: () => setOpen(false), dispatch }),
    [cart, isOpen, busy, error, announce, lastAdded, dispatch],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>
    </Ctx.Provider>
  );
}
