"use client";
/**
 * Pont entre les tokens de mouvement CSS (styles/tokens.css) et GSAP.
 * GSAP n'est chargé qu'à la demande (loadGsap) : il ne pèse pas sur le premier affichage.
 * Les durées et courbes ne sont définies qu'à un seul endroit : le CSS.
 */
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type Gsap = typeof GsapType;
export type ScrollTriggerT = typeof ScrollTriggerType;

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

type LenisLike = { on: (e: "scroll", cb: () => void) => void };
type W = Window & { __lenis?: LenisLike; __scrollTrigger?: ScrollTriggerT };

let loading: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerT }> | null = null;

/** Charge GSAP, ScrollTrigger et CustomEase une seule fois, et enregistre les courbes « silk » et « drape ». */
export function loadGsap() {
  if (!loading) {
    loading = (async () => {
      const [{ gsap }, { ScrollTrigger }, { CustomEase }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/CustomEase")]);
      gsap.registerPlugin(ScrollTrigger, CustomEase);
      for (const name of ["silk", "drape"] as const) {
        const m = cssVar(`--ease-${name}`).match(/cubic-bezier\(([^)]+)\)/);
        const pts = m ? m[1].split(",").map((n) => parseFloat(n)) : [0.22, 0.61, 0.24, 1];
        CustomEase.create(name, `M0,0 C${pts[0]},${pts[1]} ${pts[2]},${pts[3]} 1,1`);
      }
      const w = window as W;
      w.__scrollTrigger = ScrollTrigger;
      w.__lenis?.on("scroll", ScrollTrigger.update);
      return { gsap, ScrollTrigger };
    })();
  }
  return loading;
}
