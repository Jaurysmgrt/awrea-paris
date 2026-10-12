"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Cart } from "@/lib/commerce/types";
import type { CartAction } from "@/lib/commerce/cart";

type CartCtx = {
  cart: Cart | null;
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  announce: string;
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
      if (!res.ok) throw new Error(json.error ?? "Une erreur est survenue.");
      setCart(json.cart);
      if (opts?.announce) setAnnounce(opts.announce);
      if (opts?.openAfter) setOpen(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      if (opts?.openAfter) setOpen(true);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({ cart, isOpen, busy, error, announce, open: () => setOpen(true), close: () => setOpen(false), dispatch }),
    [cart, isOpen, busy, error, announce, dispatch],
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
