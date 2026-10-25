"use client";
/**
 * Marque la page comme hydratée (data-hydrated sur <html>) une fois les composants client montés :
 * les parcours de test l'attendent avant d'utiliser les raccourcis clavier et les menus.
 */
import { useEffect } from "react";

export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
