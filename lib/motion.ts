"use client";
/**
 * Pont entre les tokens de mouvement CSS (styles/tokens.css) et GSAP.
 * Les durées et courbes ne sont définies qu'à un seul endroit : le CSS.
 */
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let ready = false;

export function cssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Durée d'un token en secondes (« --dur-base » → 0.9) */
export function dur(token: "fast" | "base" | "slow"): number {
  const v = cssVar(`--dur-${token}`);
  return v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v) || 0.9;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isTouch(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

/** Enregistre les plugins GSAP et les courbes « silk » et « drape » lues dans le CSS. */
export function setupGsap() {
  if (ready || typeof window === "undefined") return gsap;
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  for (const name of ["silk", "drape"] as const) {
    const m = cssVar(`--ease-${name}`).match(/cubic-bezier\(([^)]+)\)/);
    const pts = m ? m[1].split(",").map((n) => parseFloat(n)) : [0.22, 0.61, 0.24, 1];
    CustomEase.create(name, `M0,0 C${pts[0]},${pts[1]} ${pts[2]},${pts[3]} 1,1`);
  }
  ready = true;
  return gsap;
}

export { gsap, ScrollTrigger };
