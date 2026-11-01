"use client";
import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Légère parallaxe des grandes photos de l'accueil (demande de la créatrice du 01/11 : des
 * animations discrètes mais travaillées). Chaque photo marquée par `selecteur` reçoit `--parallaxe`,
 * de −1 (sous l'écran) à 1 (au-dessus), lu par la feuille de style de l'accueil : la photo, un peu
 * agrandie, glisse de quelques pour cent dans son cadre, plus lentement que la page.
 *
 * Le film d'ouverture ([data-film]) reçoit `--sortie`, de 0 (en place) à 1 (sorti par le haut) : il
 * glisse plus lentement que la page et s'assombrit en la quittant.
 *
 * Performance : seules les photos à l'écran sont suivies (IntersectionObserver) ; une seule lecture
 * de position par photo et par image, regroupée dans requestAnimationFrame, puis une seule écriture.
 * Rien sur téléphone ni sur écran tactile, rien quand les animations sont apaisées.
 */
export function Parallaxe({ selecteur }: { selecteur: string }) {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(min-width: 48rem) and (hover: hover)").matches) return;
    const photos = [...document.querySelectorAll<HTMLElement>(`${selecteur}, [data-film]`)];
    if (!photos.length) return;
    const visibles = new Set<HTMLElement>();
    let image = 0;
    const placer = () => {
      image = 0;
      const haut = window.innerHeight;
      const positions = [...visibles].map((el) => [el, el.getBoundingClientRect()] as const);
      for (const [el, r] of positions) {
        if (el.hasAttribute("data-film")) {
          // film d'ouverture : de 0 (en place) à 1 (sorti par le haut)
          el.style.setProperty("--sortie", Math.max(0, Math.min(1, -r.top / r.height)).toFixed(3));
          continue;
        }
        const p = (r.top + r.height / 2 - haut / 2) / (haut / 2 + r.height / 2);
        el.style.setProperty("--parallaxe", Math.max(-1, Math.min(1, p)).toFixed(3));
      }
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(placer);
    };
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) visibles.add(e.target as HTMLElement);
        else visibles.delete(e.target as HTMLElement);
      }
      demander();
    });
    photos.forEach((el) => io.observe(el));
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      if (image) cancelAnimationFrame(image);
      photos.forEach((el) => {
        el.style.removeProperty("--parallaxe");
        el.style.removeProperty("--sortie");
      });
    };
  }, [selecteur]);
  return null;
}
