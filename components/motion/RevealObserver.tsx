"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Fait apparaître doucement les éléments [data-reveal] et les médias .reveal-img
 * quand ils entrent dans l'écran. Un seul observateur pour tout le site.
 *
 * Rien n'est masqué dans le HTML : seuls les éléments situés SOUS l'écran au chargement
 * sont mis en attente (data-pending), puis révélés à leur arrivée. Le contenu visible
 * d'emblée s'affiche donc immédiatement, sans attendre le JavaScript.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          el.dataset.shown = "";
          requestAnimationFrame(() => {
            delete el.dataset.pending;
          });
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      const fold = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-reveal], .reveal-img").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.getBoundingClientRect().top < fold) return; // déjà visible : on n'y touche pas
        el.dataset.pending = "";
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}
