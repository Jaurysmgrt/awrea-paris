/**
 * Statut d'une pièce dans l'Atelier (refonte du 07/11, « Shopify simplifié ») : en ligne, brouillon
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

/** Statut Shopify d'une pièce (ProductStatus) ↔ statut de l'Atelier. */
export const VERS_SHOPIFY: Record<StatutPiece, "ACTIVE" | "DRAFT" | "ARCHIVED"> = { "en-ligne": "ACTIVE", brouillon: "DRAFT", archivee: "ARCHIVED" };

export function depuisShopify(status: string): StatutPiece {
  return status === "ACTIVE" ? "en-ligne" : status === "ARCHIVED" ? "archivee" : "brouillon";
}

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

const ECHAPPE: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** Description en paragraphes → HTML de Shopify, texte échappé (aucune balise ne passe). */
export function descriptionHtml(paragraphes: string[]): string {
  return paragraphes
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/[&<>"]/g, (c) => ECHAPPE[c])}</p>`)
    .join("");
}

/** Texte saisi dans l'Atelier (paragraphes séparés par une ligne vide) → paragraphes. */
export const paragraphes = (texte: string): string[] =>
  texte
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/**
 * Photos d'une pièce : 8 au plus, ce que le site montre (lib/shopify/storefront.ts lit les 8
 * premières) ; la première est la principale, celle des listes.
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
