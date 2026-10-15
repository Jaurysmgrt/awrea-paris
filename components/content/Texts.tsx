"use client";
/**
 * Textes des composants interactifs (panier, formulaires, recherche…), lus dans les documents de
 * contenu par le serveur et transmis ici : aucun texte n'est écrit dans un composant. En mode
 * Édition, ils portent les marques invisibles qui les rendent cliquables comme le reste de la page.
 */
import { createContext, useContext, type ReactNode } from "react";

const TextsContext = createContext<Record<string, unknown>>({});

export function TextsProvider({ docs, children }: { docs: Record<string, unknown>; children: ReactNode }) {
  const parent = useContext(TextsContext);
  return <TextsContext.Provider value={{ ...parent, ...docs }}>{children}</TextsContext.Provider>;
}

/** Textes d'un document ; le document doit avoir été transmis par un TextsRoot au-dessus. */
export function useTexts<T>(doc: string): T {
  const all = useContext(TextsContext);
  const t = all[doc];
  if (t === undefined) throw new Error(`Textes absents pour le document ${doc}. Ajouter un TextsRoot qui le transmet au-dessus du composant.`);
  return t as T;
}
