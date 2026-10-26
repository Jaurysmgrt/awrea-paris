"use client";
import { useEffect } from "react";
import { useConsent } from "@/components/consent/ConsentProvider";
import { track } from "@/lib/analytics/track";
import { rememberSeen } from "@/lib/personalization/seen";

/**
 * Consultation d'une fiche produit :
 *  - mesure d'audience acceptée → compteur agrégé de vues (sans donnée personnelle) ;
 *  - personnalisation acceptée → pièce mémorisée (sur l'appareil, et dans le compte si connectée)
 *    pour l'accueil personnalisé et les recommandations.
 */
export function ViewTracker({ handle, title, price, collection }: { handle: string; title?: string; price?: number; collection?: string }) {
  const { has } = useConsent();
  const analytics = has("analytics");
  const personalization = has("personalization");

  useEffect(() => {
    if (analytics) {
      const key = `awrea_view_${handle}`;
      let first = true;
      try {
        first = !sessionStorage.getItem(key);
        sessionStorage.setItem(key, "1");
      } catch {
        /* stockage indisponible */
      }
      if (first) navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ handle })], { type: "application/json" }));
    }
    if (title && price != null) track({ name: "view_item", handle, title, price });
  }, [analytics, handle, title, price]);

  useEffect(() => {
    if (!personalization) return;
    rememberSeen({ kind: "view", handle, collection });
  }, [personalization, handle, collection]);

  return null;
}
