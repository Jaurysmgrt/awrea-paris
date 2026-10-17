"use client";
/**
 * Pont entre les tokens de mouvement CSS (styles/tokens.css) et le JS (GSAP, Lenis).
 * GSAP n'est chargé qu'à la demande (loadGsap) : il ne pèse pas sur le premier affichage.
 * Une seule durée (--dur) et une seule courbe (--ease), définies à un seul endroit : le CSS.
 */
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type Gsap = typeof GsapType;
export type ScrollTriggerT = typeof ScrollTriggerType;

export function cssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * La durée unique des animations, en secondes (« --dur » → 0.8).
 * L'argument des anciennes durées (« fast », « base », « slow ») est ignoré : il n'y a plus qu'une durée.
 */
export function dur(_ancien?: "fast" | "base" | "slow"): number {
  const v = cssVar("--dur");
  return v.endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v) || 0.8;
}

/** Nom de la courbe unique, enregistrée dans GSAP par loadGsap(). */
export const EASE = "awrea";

/** Points de contrôle de la courbe unique (« --ease : cubic-bezier(…) »). */
export function easePoints(): [number, number, number, number] {
  const m = cssVar("--ease").match(/cubic-bezier\(([^)]+)\)/);
  const pts = m ? m[1].split(",").map((n) => parseFloat(n)) : [];
  return pts.length === 4 && pts.every(Number.isFinite) ? (pts as [number, number, number, number]) : [0.22, 0.61, 0.24, 1];
}

/** La même courbe en fonction JS (pour Lenis) : résolution de la courbe de Bézier par dichotomie. */
export function easeFn(): (t: number) => number {
  const [x1, y1, x2, y2] = easePoints();
  const bez = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}

/** Réglage du système, ou choix « Animations apaisées » fait sur le site (lib/prefs.ts). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
}

export function isTouch(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

type LenisLike = { on: (e: "scroll", cb: () => void) => void };
type W = Window & { __lenis?: LenisLike; __scrollTrigger?: ScrollTriggerT };

let loading: Promise<{ gsap: Gsap; ScrollTrigger: ScrollTriggerT }> | null = null;

/** Charge GSAP, ScrollTrigger et CustomEase une seule fois, et enregistre la courbe unique (EASE). */
export function loadGsap() {
  if (!loading) {
    loading = (async () => {
      const [{ gsap }, { ScrollTrigger }, { CustomEase }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/CustomEase")]);
      gsap.registerPlugin(ScrollTrigger, CustomEase);
      const [x1, y1, x2, y2] = easePoints();
      CustomEase.create(EASE, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
      const w = window as W;
      w.__scrollTrigger = ScrollTrigger;
      w.__lenis?.on("scroll", ScrollTrigger.update);
      return { gsap, ScrollTrigger };
    })();
  }
  return loading;
}
