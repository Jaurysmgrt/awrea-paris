/**
 * Les deux polices officielles de la Maison (ressources-awrea/TYPO, préparées par
 * `npm run ressources`), servies par le site lui-même : fichiers WOFF2 dans styles/fonts, licence
 * SIL Open Font License jointe, aucun appel à Google Fonts. Sous-ensemble latin (français et anglais
 * complets : accents, ligatures, guillemets, espaces insécables, euro).
 *
 * - Grands titres (28 px et plus) : Fraunces 120pt Light, droite, graisse 300 (« POLICE GRANDS
 *   TITRES », cahier des modifications du 27/10 : la police variable Fraunces, licence OFL, figée à
 *   la taille optique 120 et à la graisse 300).
 * - Petits titres (25 px : questions de la FAQ, lettres, signatures) : Fraunces 72pt Italic, graisse
 *   400 (« POLICE TITRES »).
 *   Les deux faces forment une seule famille : le style et la graisse choisissent la face
 *   (--font-style-title et --font-weight-title, --font-style-display ; styles/tokens.css).
 * - Textes, navigation, boutons, formulaires : Cormorant Garamond Regular, graisse 400
 *   (« POLICE TEXTES »). Aucune face italique ni grasse n'est fournie : le navigateur ne les imite
 *   jamais (`font-synthesis: none`, styles/base.css).
 *
 * La police du logo (Croisan, licence personnelle) n'est jamais chargée : le logo s'affiche à
 * partir des fichiers officiels (content/brand/assets.ts).
 *
 * Le nom de chaque constante devient le nom de la famille dans le CSS (« fraunces »,
 * « cormorant ») : tests/e2e/homogeneite.spec.ts s'en sert pour vérifier qu'aucune autre police
 * n'apparaît. Pour remplacer un fichier, garder le même nom de constante et de variable.
 */
import localFont from "next/font/local";

/** Titres : très grands, interlignage serré ; grands titres droits et fins, petits titres en italique. */
export const fraunces = localFont({
  src: [
    { path: "../styles/fonts/fraunces-120pt-light-latin.woff2", weight: "300", style: "normal" },
    { path: "../styles/fonts/fraunces-72pt-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Textes courants, navigation, boutons, formulaires : 20 px sur 32 px, jamais sous 16 px. */
export const cormorant = localFont({
  src: [{ path: "../styles/fonts/cormorant-garamond-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Garamond", "Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const fontVariables = [fraunces.variable, cormorant.variable].join(" ");
