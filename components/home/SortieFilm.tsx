"use client";
import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Sortie du film d'ouverture de l'accueil (l'animation que la créatrice préfère, 01/11 : « quand ça
 * passe derrière ») : le film ([data-film]) reçoit `--sortie`, de 0 (en place) à 1 (sorti par le
 * haut), lu par la feuille de style de l'accueil ; il glisse plus lentement que la page et s'assombrit
 * en la quittant, pendant que la section suivante passe par-dessus.
 *
 * Performance : le film n'est suivi que tant qu'il est à l'écran (IntersectionObserver) ; une seule
 * lecture de position par image, regroupée dans requestAnimationFrame, puis une seule écriture.
 * Rien sur téléphone ni sur écran tactile, rien quand les animations sont apaisées.
 */
export function SortieFilm() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia("(min-width: 48rem) and (hover: hover)").matches) return;
    const film = document.querySelector<HTMLElement>("[data-film]");
    if (!film) return;
    let visible = false;
    let image = 0;
    const placer = () => {
      image = 0;
      if (!visible) return;
      const r = film.getBoundingClientRect();
      film.style.setProperty("--sortie", Math.max(0, Math.min(1, -r.top / r.height)).toFixed(3));
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(placer);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      demander();
    });
    io.observe(film);
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      if (image) cancelAnimationFrame(image);
      film.style.removeProperty("--sortie");
    };
  }, []);
  return null;
}
