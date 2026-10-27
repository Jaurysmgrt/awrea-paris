/**
 * Césure des paragraphes justifiés (cahier des modifications du 27/10 : justifié, sans trou entre
 * les mots). Les navigateurs ne coupent pas tous les mots français en fin de ligne (dictionnaire de
 * césure absent ou prudent) : la justification élargit alors les espaces. Le site place lui-même
 * les points de coupure possibles (trait d'union conditionnel U+00AD, invisible tant que le mot
 * n'est pas coupé), d'après les motifs de césure du français et de l'anglais britannique.
 *
 * Règles de typographie : mots de 7 lettres au moins, 3 lettres au moins de chaque côté de la
 * coupure, jamais dans un nom propre (majuscule), une adresse e-mail, un lien, un nombre ou un mot
 * qui porte déjà une coupure. Module pur : composant components/ui/Justification.tsx et tests.
 */
export const SHY = "­";
const MIN_WORD = 7;
const MIN_SIDE = 3;

export type Hyphenate = (word: string, options: { hyphenChar: string; minWordLength: number }) => string;

/** Coupures d'un mot, filtrées par les règles de la Maison (3 lettres de chaque côté). */
export function hyphenateWord(word: string, hyphenate: Hyphenate): string {
  if (word.length < MIN_WORD || /^\p{Lu}/u.test(word) || word.includes(SHY)) return word;
  const parts = hyphenate(word, { hyphenChar: SHY, minWordLength: MIN_WORD }).split(SHY);
  if (parts.length < 2) return word;
  let out = "";
  let left = 0;
  for (let i = 0; i < parts.length; i++) {
    out += parts[i];
    left += parts[i].length;
    if (i < parts.length - 1 && left >= MIN_SIDE && word.length - left >= MIN_SIDE) out += SHY;
  }
  return out;
}

/** Texte entier : chaque suite de lettres est coupée, rien d'autre ne change (espaces, ponctuation). */
export function hyphenateText(text: string, hyphenate: Hyphenate): string {
  // jetons sans espace : un jeton qui contient @, /, :// ou un chiffre (e-mail, lien, adresse, prix) reste entier
  return text.replace(/[^\s  ]+/g, (token) => (/[@/\d]|:\/\//.test(token) ? token : token.replace(/\p{L}+/gu, (w) => hyphenateWord(w, hyphenate))));
}

/** Retire les coupures posées par le site (texte copié, comparaisons). */
export const unhyphenate = (text: string) => text.replaceAll(SHY, "");
