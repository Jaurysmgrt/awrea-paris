"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * SIGNATURE 9 — Alternance noir et ivoire au scroll.
 * La section qui occupe le centre de l'écran donne sa couleur à toute la scène :
 * le fond et le texte basculent lentement (transition CSS sur --dur).
 * À l'activation (chargement, changement de page), la bascule est instantanée :
 * les sections hors écran n'ont aucune transition à jouer.
 */
export function ThemeShift() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > .scene[data-theme], main > article > .scene[data-theme], .site-footer[data-theme]"));
    if (!sections.length) return;
    const setScene = (theme: string | undefined) => {
      root.dataset.scene = theme === "ink" || theme === "pearl" ? theme : "ivory";
    };
    root.classList.add("scene-instant");
    setScene(sections[0].dataset.theme);
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
      io.disconnect();
      root.classList.remove("scene-live", "scene-instant");
    };
  }, [pathname]);
  return null;
}
