"use client";
/**
 * Apparition de la frise des étapes (page « À la demande » seulement, brief du 02/11) : la ligne se
 * dessine, puis chaque étape vient par un fondu et un léger glissement vertical quand elle entre à
 * l'écran. Sans JavaScript, ou en animations apaisées, tout est déjà là.
 */
import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function FriseApparition({ id }: { id: string }) {
  useEffect(() => {
    const frise = document.getElementById(id);
    if (!frise || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    frise.dataset.anime = "1";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.vu = "1";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(frise);
    for (const li of frise.querySelectorAll("li")) io.observe(li);
    return () => io.disconnect();
  }, [id]);
  return null;
}
