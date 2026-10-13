"use client";
import { useEffect } from "react";
import { dur, easeFn, isTouch, prefersReducedMotion } from "@/lib/motion";

type W = Window & { __lenis?: { destroy: () => void; on: (e: "scroll", cb: () => void) => void }; __scrollTrigger?: { update: () => void } };

/**
 * Défilement doux (Lenis) sur ordinateur uniquement : au tactile, le défilement natif
 * reste le plus fluide et le plus économe. Coupé si « mouvement réduit ». Même durée et même
 * courbe que toutes les animations du site (lib/motion.ts).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;
    let cancelled = false;
    let lenis: { destroy: () => void } | null = null;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ duration: dur(), easing: easeFn(), autoRaf: true });
      const w = window as W;
      if (w.__scrollTrigger) l.on("scroll", w.__scrollTrigger.update);
      w.__lenis = l;
      lenis = l;
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
      (window as W).__lenis = undefined;
    };
  }, []);
  return <>{children}</>;
}
