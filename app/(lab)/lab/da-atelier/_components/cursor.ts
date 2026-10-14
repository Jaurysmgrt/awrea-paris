/**
 * Curseur monogramme (MARQUE.md § 3, arbitrage 1) : le « AW » du logo, blanc cassé cerné d'un
 * filet noir, lisible sur la dentelle claire comme sur la dentelle noire. Il ne remplace le
 * pointeur qu'au-dessus des images de dentelle et des pièces (règle CSS `[data-curseur]`) ; le
 * pointeur système reste partout ailleurs, au tactile et en mode apaisé.
 *
 * Image de curseur : le navigateur n'y lit pas les variables CSS. Les couleurs viennent donc du
 * miroir TypeScript du design system (styles/tokens.ts), jamais d'une valeur écrite ici.
 */
import { monogramPaths } from "@/content/brand/logo-paths";
import { palette } from "@/styles/tokens";

/* taille de l'image et point actif, en pixels du curseur (unités internes de l'image) */
const W = 40;
const H = Math.round((W * 144) / 177);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${monogramPaths.viewBox}"><path d="${monogramPaths.aw}" fill="${palette.ivory}" stroke="${palette.ink}" stroke-width="7" stroke-linejoin="round" paint-order="stroke"/></svg>`;

/** Valeur de la propriété `cursor`, posée en variable CSS (--da-curseur) sur la page. */
export const MONOGRAM_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${W / 2} ${Math.round(H / 2)}, zoom-in`;
