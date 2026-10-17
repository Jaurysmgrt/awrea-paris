"use client";
/**
 * Adresse secrète de l'Atelier, transmise aux composants de l'Atelier par sa mise en page
 * (jamais par une variable publique : elle ne doit apparaître dans aucun fichier servi au public).
 */
import { createContext, useContext } from "react";

const AtelierBase = createContext("/gestion");

export function AtelierProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <AtelierBase.Provider value={base}>{children}</AtelierBase.Provider>;
}

/** Liens et routes d'API de l'Atelier, préfixés par son adresse. */
export function useAtelier() {
  const base = useContext(AtelierBase);
  return {
    base,
    href: (path = "/") => (path === "/" || path === "" ? base : `${base}${path}`),
    api: (path: string) => `${base}/api${path}`,
  };
}
