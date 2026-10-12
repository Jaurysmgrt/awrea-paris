"use client";
/** Liste d'envies : conservée sur l'appareil (et synchronisée avec le compte quand il existe). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { handles: string[]; has: (h: string) => boolean; toggle: (h: string) => void };
const WishlistContext = createContext<Ctx>({ handles: [], has: () => false, toggle: () => {} });
export const useWishlist = () => useContext(WishlistContext);

const KEY = "awrea_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [handles, setHandles] = useState<string[]>([]);

  useEffect(() => {
    try {
      setHandles(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const toggle = useCallback((h: string) => {
    setHandles((prev) => {
      const next = prev.includes(h) ? prev.filter((x) => x !== h) : [h, ...prev];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* stockage indisponible */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ handles, has: (h: string) => handles.includes(h), toggle }), [handles, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
