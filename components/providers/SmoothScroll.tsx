"use client";
import { useEffect } from "react";
import { dur, easeFn, isTouch, prefersReducedMotion } from "@/lib/motion";

type W = Window & { __lenis?: { destroy: () => void; on: (e: "scroll", cb: () => void) => void }; __scrollTrigger?: { update: () => void } };

/**
 * Défilement doux (Lenis) sur ordinateur uniquement : au tactile, le défilement natif
 * reste le plus fluide et le plus économe. Coupé si « mouvement réduit ». Même durée et même
 * courbe que toutes les animations du site (lib/motion.ts).
 *
 * Les fenêtres (panier, recherche, menus en <dialog>) gardent leur propre défilement : sans
 * `prevent`, Lenis arrêté bloquerait la molette à l'intérieur (panier impossible à faire défiler
 * sur un ordinateur portable, cahier des modifications du 27/10).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;
    let cancelled = false;
    let lenis: { destroy: () => void } | null = null;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const l = new Lenis({ duration: dur(), easing: easeFn(), autoRaf: true, prevent: (node: HTMLElement) => node.nodeName === "DIALOG" });
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
