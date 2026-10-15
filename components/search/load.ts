"use client";
import type { SearchEntry } from "@/lib/search/match";

let pending: Promise<SearchEntry[]> | null = null;

/** Charge l'index une seule fois (dès le survol du bouton « Rechercher », pour un affichage immédiat). */
export function loadSearchIndex(): Promise<SearchEntry[]> {
  if (!pending) {
    pending = fetch("/api/search")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { entries: SearchEntry[] }) => j.entries)
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}
