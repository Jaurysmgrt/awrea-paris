"use client";
import { useEffect } from "react";
import { isTouch, prefersReducedMotion } from "@/lib/motion";

type W = Window & { __lenis?: { destroy: () => void; on: (e: "scroll", cb: () => void) => void }; __scrollTrigger?: { update: () => void } };

/**
 * Défilement doux (Lenis) sur ordinateur uniquement : au tactile, le défilement natif
 * reste le plus fluide et le plus économe. Coupé si « mouvement réduit ».
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;
    let cancelled = false;
    let lenis: { destroy: () => void } | null = null;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ duration: 1.15, easing: (t: number) => 1 - Math.pow(1 - t, 3), autoRaf: true });
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
