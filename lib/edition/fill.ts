/**
 * Repères dans les textes : « Livraison offerte dès {seuil} » ; la valeur est insérée à l'affichage.
 * La marque invisible du mode Édition (lib/edition/stega.ts) reste en fin de texte.
 *
 * Nom de pièce anglais (« The Aura bodysuit », version anglaise du site) inséré au milieu d'une
 * phrase : son article perd sa capitale (« See the Aura bodysuit ») ; en tête de texte ou après un
 * point, il la garde (« The Aura bodysuit is in your bag. »).
 */
const midSentence = (before: string) => {
  const t = before.replace(/[\s ]+$/, "");
  return t.length > 0 && !/[.!?…]$/.test(t);
};

export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{([a-zA-Z][\w]*)\}/g, (m, name: string, offset: number) => {
    if (!(name in vars)) return m;
    const value = String(vars[name]);
    return /^The\s/.test(value) && midSentence(text.slice(0, offset)) ? `t${value.slice(1)}` : value;
  });
}

/** Paragraphes d'un texte long : une ligne vide sépare deux paragraphes. */
export const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
