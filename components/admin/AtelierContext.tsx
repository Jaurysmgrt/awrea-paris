"use client";
/**
 * Adresse secrète de l'Atelier, transmise aux composants de l'Atelier par sa mise en page
 * (jamais par une variable publique : elle ne doit apparaître dans aucun fichier servi au public).
 */
import { createContext, useContext, useMemo } from "react";

const AtelierBase = createContext("/gestion");

export function AtelierProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <AtelierBase.Provider value={base}>{children}</AtelierBase.Provider>;
}

/**
 * Liens et routes d'API de l'Atelier, préfixés par son adresse. Le même objet tant que l'adresse ne
 * change pas : un effet qui en dépend ne se relance pas à chaque rendu (l'aperçu de l'éditeur
 * d'e-mails se rechargeait en boucle et le brouillon ne s'enregistrait jamais tout seul).
 */
export function useAtelier() {
  const base = useContext(AtelierBase);
  return useMemo(
    () => ({
      base,
      href: (path = "/") => (path === "/" || path === "" ? base : `${base}${path}`),
      api: (path: string) => `${base}/api${path}`,
    }),
    [base],
  );
}
