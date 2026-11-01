"use client";
import { useEffect } from "react";
import { dur, easeFn, isTouch, prefersReducedMotion } from "@/lib/motion";

type W = Window & { __lenis?: { destroy: () => void; on: (e: "scroll", cb: () => void) => void }; __scrollTrigger?: { update: () => void } };

/**
 * Défilement (Lenis) sur ordinateur uniquement : au tactile, le défilement natif reste le plus
 * fluide et le plus économe. Coupé si « mouvement réduit ».
 *
 * La molette et le pavé tactile défilent nativement (`smoothWheel: false`, retour de la créatrice
 * du 01/11 : « la fluidité est super lourde quand on scrolle ») : lissé sur 0,8 s, chaque geste
 * arrivait en retard, et le pavé tactile d'un Mac, déjà amorti par le système, recevait une
 * seconde inertie. Lenis garde les défilements commandés par le site (ancre, retour en haut après
 * un changement de page), avec la durée et la courbe de toutes les animations (lib/motion.ts), et
 * l'arrêt du défilement derrière les fenêtres et le choix des cookies.
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
      const l = new Lenis({ smoothWheel: false, duration: dur(), easing: easeFn(), autoRaf: true, prevent: (node: HTMLElement) => node.nodeName === "DIALOG" });
      const w = window as W;
      if (w.__scrollTrigger) l.on("scroll", w.__scrollTrigger.update);
      w.__lenis = l;
      lenis = l;
      // choix des cookies encore à faire : la page reste immobile derrière le voile
      if (document.documentElement.classList.contains("consent-bloque")) l.stop();
    });
    return () => {
      cancelled = true;
      lenis?.destroy();
      (window as W).__lenis = undefined;
    };
  }, []);
  return <>{children}</>;
}
