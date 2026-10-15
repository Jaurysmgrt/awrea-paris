"use client";
/**
 * Liste d'envies : conservée sur l'appareil et, pour une cliente connectée, synchronisée
 * avec son compte (fusion des deux à la connexion, puis chaque geste enregistré).
 * La liste vit dans un petit magasin externe (stockage local + autres onglets) lu par
 * useSyncExternalStore : le rendu serveur part d'une liste vide, sans écart à l'hydratation.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type Ctx = { handles: string[]; has: (h: string) => boolean; toggle: (h: string) => void; sync: () => Promise<void> };
const WishlistContext = createContext<Ctx>({ handles: [], has: () => false, toggle: () => {}, sync: async () => {} });
export const useWishlist = () => useContext(WishlistContext);

const KEY = "awrea_wishlist";
const EMPTY: string[] = [];
const signedIn = () => /(?:^|; )awrea_signed_in=1/.test(document.cookie);

let current: string[] | null = null;
const listeners = new Set<() => void>();

function readLocal(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === "string") : [];
  } catch {
    return [];
  }
}

function getSnapshot(): string[] {
  if (current === null) current = readLocal();
  return current;
}

function setList(next: string[]) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible : la liste vaut pour la visite en cours */
  }
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = readLocal();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function saveRemote(next: string[]) {
  if (!signedIn()) return;
  fetch("/api/account/wishlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handles: next }) }).catch(() => {});
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const handles = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  /** Fusionne la liste de l'appareil et celle du compte (à l'ouverture et après connexion). */
  const sync = useCallback(async () => {
    if (!signedIn()) return;
    const j = (await fetch("/api/account/wishlist", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as { handles: string[] } | null;
    if (!j) return;
    const merged = [...new Set([...getSnapshot(), ...j.handles])];
    setList(merged);
    if (merged.length !== j.handles.length) saveRemote(merged);
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  const toggle = useCallback((h: string) => {
    const prev = getSnapshot();
    const next = prev.includes(h) ? prev.filter((x) => x !== h) : [h, ...prev];
    setList(next);
    saveRemote(next);
  }, []);

  const value = useMemo(() => ({ handles, has: (h: string) => handles.includes(h), toggle, sync }), [handles, toggle, sync]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
