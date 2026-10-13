"use client";
/**
 * Liste d'envies : conservée sur l'appareil et, pour une cliente connectée, synchronisée
 * avec son compte (fusion des deux à la connexion, puis chaque geste enregistré).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Ctx = { handles: string[]; has: (h: string) => boolean; toggle: (h: string) => void; sync: () => Promise<void> };
const WishlistContext = createContext<Ctx>({ handles: [], has: () => false, toggle: () => {}, sync: async () => {} });
export const useWishlist = () => useContext(WishlistContext);

const KEY = "awrea_wishlist";
const signedIn = () => /(?:^|; )awrea_signed_in=1/.test(document.cookie);

function persistLocal(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible */
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [handles, setHandles] = useState<string[]>([]);

  const latest = useRef<string[]>([]);
  latest.current = handles;

  /** Fusionne la liste de l'appareil et celle du compte (à l'ouverture et après connexion). */
  const sync = useCallback(async () => {
    if (!signedIn()) return;
    const j = (await fetch("/api/account/wishlist", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as { handles: string[] } | null;
    if (!j) return;
    const merged = [...new Set([...latest.current, ...j.handles])];
    setHandles(merged);
    persistLocal(merged);
    if (merged.length !== j.handles.length) save(merged);
  }, []);

  useEffect(() => {
    let local: string[] = [];
    try {
      local = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      /* stockage indisponible */
    }
    latest.current = local;
    setHandles(local);
    sync();
  }, [sync]);

  const save = (next: string[]) => {
    if (!signedIn()) return;
    fetch("/api/account/wishlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handles: next }) }).catch(() => {});
  };

  const toggle = useCallback((h: string) => {
    setHandles((prev) => {
      const next = prev.includes(h) ? prev.filter((x) => x !== h) : [h, ...prev];
      persistLocal(next);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ handles, has: (h: string) => handles.includes(h), toggle, sync }), [handles, toggle, sync]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
