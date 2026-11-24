/**
 * Polices du site, servies par le site lui-même (fichiers WOFF2 dans styles/fonts, licence SIL Open
 * Font License jointe, aucun appel à Google Fonts). Sous-ensemble latin (français et anglais
 * complets : accents, ligatures, guillemets, espaces insécables, euro).
 *
 * - Grands titres (28 px et plus) : Fraunces 120pt Light, droite, graisse 300 (« POLICE GRANDS
 *   TITRES », cahier des modifications du 27/10 : la police variable Fraunces, licence OFL, figée à
 *   la taille optique 120 et à la graisse 300).
 * - Petits titres (25 px : questions de la FAQ, lettres, signatures) : Fraunces 72pt Italic, graisse
 *   400 (« POLICE TITRES »).
 *   Les deux faces forment une seule famille : le style et la graisse choisissent la face
 *   (--font-style-title et --font-weight-title, --font-style-display ; styles/tokens.css).
 * - Textes, navigation, menus, boutons, formulaires, petits textes (choix de la créatrice du 23/11) :
 *   Avenir Next Regular (400). Police commerciale (Monotype) : aucun fichier n'est dans le projet ni
 *   servi par le site. Elle est installée d'origine sur iPhone, iPad et Mac, où la pile des textes
 *   la prend en premier par son nom (« Avenir Next », puis « Avenir » ; --font-body, styles/tokens.css),
 *   sans @font-face qui la déguiserait. Ailleurs (Windows, Android), Mulish Regular, police libre
 *   proche, sous son vrai nom (ci-dessous). Si la Maison achète un jour une licence web d'Avenir
 *   Next : ses fichiers iront dans styles/fonts (RESSOURCES.md), déclarés ici comme Mulish.
 *   Une seule graisse (400) : le navigateur n'imite jamais un gras ni un italique
 *   (`font-synthesis: none`, styles/base.css).
 *
 * Cormorant Garamond (textes jusqu'au 23/11) n'est plus chargée par aucune page : ses fichiers restent
 * dans le dépôt pour les factures et étiquettes PDF (assets/pdf) et les e-mails déjà envoyés
 * (public/fonts).
 *
 * La police du logo (Croisan, licence personnelle) n'est jamais chargée : le logo s'affiche à
 * partir des fichiers officiels (content/brand/assets.ts).
 *
 * Le nom de chaque constante devient le nom de la famille dans le CSS (« fraunces », « mulish ») :
 * tests/e2e/homogeneite.spec.ts s'en sert pour vérifier qu'aucune autre police n'apparaît. Pour
 * remplacer un fichier, garder le même nom de constante et de variable.
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

/**
 * Textes sur les appareils sans Avenir Next : Mulish Regular (SIL OFL, The Mulish Project Authors,
 * fichier du paquet @fontsource/mulish, sous-ensemble latin de Google Fonts). Jamais préchargée : le
 * navigateur ne la télécharge que si Avenir Next et Avenir manquent (jamais sur iPhone, iPad ni Mac),
 * et seulement pour les caractères de son sous-ensemble (unicode-range).
 */
export const mulish = localFont({
  src: [{ path: "../styles/fonts/mulish-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-mulish",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const fontVariables = [fraunces.variable, mulish.variable].join(" ");
