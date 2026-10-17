"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/** Conversion « achat » envoyée une seule fois par commande, aux seuls outils acceptés. */
export function PurchaseTracker({ number, value, items }: { number: string; value: number; items: number }) {
  useEffect(() => {
    const key = `awrea_purchase_${number}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* stockage indisponible */
    }
    // laisse le temps aux outils (chargés après accord) de s'initialiser
    const t = window.setTimeout(() => track({ name: "purchase", number, value, items }), 800);
    return () => window.clearTimeout(t);
  }, [number, value, items]);
  return null;
}
