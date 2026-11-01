"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { dur, easeFn } from "@/lib/motion";

/**
 * SIGNATURE 9 — Alternance noir et ivoire au scroll.
 * La section qui occupe le centre de l'écran donne sa couleur à toute la scène. Seul le fond glisse
 * d'une couleur à l'autre (data-fond : une seule couleur animée, sur <body> et la bande de
 * l'en-tête) ; les textes, filets et boutons basculent d'un coup quand le fond est à mi-chemin
 * (data-scene), sans transition : animer leurs couleurs recalculait des centaines d'éléments à
 * chaque image et faisait saccader le défilement. À mi-chemin, le fond n'est ni clair ni sombre :
 * les textes restent lisibles avant comme après la bascule.
 * À l'activation (chargement, changement de page), la bascule est instantanée :
 * les sections hors écran n'ont aucune transition à jouer.
 */
export function ThemeShift() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > .scene[data-theme], main > article > .scene[data-theme], .site-footer[data-theme]"));
    if (!sections.length) return;
    // instant où la courbe unique atteint la moitié du chemin
    const ease = easeFn();
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (ease(mid) < 0.5) lo = mid;
      else hi = mid;
    }
    const half = dur() * 1000 * lo;
    let timer = 0;
    let flipRaf = 0;
    // les couleurs changent sans transition le temps d'un rendu (les mouvements continuent)
    const flip = (scene: string) => {
      root.classList.add("scene-flip");
      root.dataset.scene = scene;
      cancelAnimationFrame(flipRaf);
      flipRaf = requestAnimationFrame(() => {
        flipRaf = requestAnimationFrame(() => root.classList.remove("scene-flip"));
      });
    };
    const setScene = (theme: string | undefined, instant = false) => {
      const scene = theme === "ink" || theme === "pearl" ? theme : "ivory";
      window.clearTimeout(timer);
      root.dataset.fond = scene;
      if (instant) flip(scene);
      else if (root.dataset.scene !== scene) timer = window.setTimeout(() => flip(scene), half);
    };
    root.classList.add("scene-instant");
    setScene(sections[0].dataset.theme, true);
    root.classList.add("scene-live");
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => root.classList.remove("scene-instant"));
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setScene((e.target as HTMLElement).dataset.theme);
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(flipRaf);
      window.clearTimeout(timer);
      io.disconnect();
      root.classList.remove("scene-live", "scene-instant", "scene-flip");
    };
  }, [pathname]);
  return null;
}
