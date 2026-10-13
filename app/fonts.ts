/**
 * Les deux familles du site. Pour passer à des fichiers fournis par la maison :
 * remplacer ces imports par `next/font/local` en gardant les mêmes noms de variables
 * (--font-instrument, --font-inter-tight). Rien d'autre à modifier.
 */
import { Instrument_Serif, Inter_Tight } from "next/font/google";

/** Titres : serif contemporain, fin, en très grand format. Jamais d'italique. */
export const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal"],
  variable: "--font-instrument",
  display: "swap",
});

/** Textes, navigation et boutons : grotesque épurée, graisses légères (300 et 400). */
export const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const fontVariables = [instrument.variable, interTight.variable].join(" ");
