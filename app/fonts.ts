/**
 * Polices du site. Pour passer aux polices officielles de la marque :
 * remplacer ces imports par `next/font/local` en gardant les mêmes noms de variables
 * (--font-bodoni, --font-cormorant, --font-pinyon, --font-jost). Rien d'autre à modifier.
 */
import { Bodoni_Moda, Cormorant_Garamond, Jost, Pinyon_Script } from "next/font/google";

export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["italic", "normal"],
  variable: "--font-cormorant",
  display: "swap",
});

export const pinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon",
  display: "swap",
});

export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-jost",
  display: "swap",
});

export const fontVariables = [bodoni.variable, cormorant.variable, pinyon.variable, jost.variable].join(" ");
