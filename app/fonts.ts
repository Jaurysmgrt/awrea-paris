/**
 * Les deux familles du site, servies par le site lui-même (fichiers WOFF2 dans styles/fonts,
 * licence SIL Open Font License jointe) : aucun appel à Google Fonts, ni à la compilation ni dans
 * le navigateur. Sous-ensemble latin (français et anglais complets : accents, ligatures, guillemets,
 * espaces insécables, euro).
 *
 * Pour passer à des fichiers fournis par la maison : remplacer les fichiers en gardant les mêmes
 * noms de variables (--font-instrument, --font-inter-tight). Rien d'autre à modifier.
 */
import localFont from "next/font/local";

/** Titres : serif contemporain, fin, en très grand format. Jamais d'italique. */
export const instrument = localFont({
  src: [{ path: "../styles/fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-instrument",
  display: "swap",
  fallback: ["Times New Roman", "Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Textes, navigation et boutons : grotesque épurée, graisses légères (300 et 400) ; un seul fichier variable. */
export const interTight = localFont({
  src: [{ path: "../styles/fonts/inter-tight-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter-tight",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const fontVariables = [instrument.variable, interTight.variable].join(" ");
