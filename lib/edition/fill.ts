/**
 * Repères dans les textes : « Livraison offerte dès {seuil} » ; la valeur est insérée à l'affichage.
 * La marque invisible du mode Édition (lib/edition/stega.ts) reste en fin de texte.
 */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{([a-zA-Z][\w]*)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Paragraphes d'un texte long : une ligne vide sépare deux paragraphes. */
export const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
