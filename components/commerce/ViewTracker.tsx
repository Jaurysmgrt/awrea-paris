"use client";
import { useEffect } from "react";
import { useConsent } from "@/components/layout/CookieBanner";

/** Compte une vue de fiche produit, uniquement si la mesure d'audience a été acceptée. */
export function ViewTracker({ handle }: { handle: string }) {
  const consent = useConsent();
  useEffect(() => {
    if (!consent?.analytics) return;
    const key = `awrea_view_${handle}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* stockage indisponible */
    }
    navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ handle })], { type: "application/json" }));
  }, [consent?.analytics, handle]);
  return null;
}
