/**
 * Statut d'une pièce dans l'Atelier (refonte du 07/11) : en ligne, brouillon
 * ou archivée. Une pièce en brouillon ou archivée n'apparaît jamais sur le site public. Module pur,
 * partagé par le catalogue de l'Atelier (lib/commerce/atelier-catalogue.ts) et les tests unitaires.
 */

export type StatutPiece = "en-ligne" | "brouillon" | "archivee";

export const STATUTS: readonly StatutPiece[] = ["en-ligne", "brouillon", "archivee"];

export const LIBELLE_STATUT: Record<StatutPiece, string> = {
  "en-ligne": "En ligne",
  brouillon: "Brouillon",
  archivee: "Archivée",
};

/**
 * Adresse d'une copie : « robe-odessa » → « robe-odessa-copie », puis « robe-odessa-copie-2 »… sans
 * jamais reprendre une adresse prise (en ligne, brouillon ou archivée).
 */
export function adresseDeCopie(handle: string, prises: Iterable<string>): string {
  const deja = new Set(prises);
  const base = `${handle.replace(/-copie(?:-\d+)?$/, "")}-copie`.slice(0, 110);
  if (!deja.has(base)) return base;
  for (let n = 2; n < 1000; n++) if (!deja.has(`${base}-${n}`)) return `${base}-${n}`;
  throw new Error("Trop de copies de cette pièce.");
}

/** Nom d'une copie : « La robe Odessa » → « La robe Odessa (copie) ». */
export const nomDeCopie = (title: string) => `${title.replace(/\s*\(copie(?: \d+)?\)$/, "")} (copie)`;

/** Texte saisi dans l'Atelier (paragraphes séparés par une ligne vide) → paragraphes. */
export const paragraphes = (texte: string): string[] =>
  texte
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/**
 * Photos d'une pièce : 8 au plus ; la première est la principale, celle des listes.
 */
export const PHOTOS_MAX = 8;

/** Bornes du prix d'une pièce, en euros. */
export const PRIX_MIN = 1;
export const PRIX_MAX = 100000;

/**
 * Textes rangés par photo (les textes alternatifs traduits, par exemple) après un changement
 * d'ordre : chaque texte suit sa photo, repérée par sa clé ; une photo nouvelle n'a pas de texte
 * (le site reprend alors le texte français).
 */
export function realignerParCle(avant: readonly string[], apres: readonly string[], textes: readonly (string | undefined)[]): string[] {
  return apres.map((cle) => {
    const i = avant.indexOf(cle);
    return i >= 0 ? (textes[i] ?? "") : "";
  });
}
