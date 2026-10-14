"use client";
/**
 * AJOURER — le seul verbe de mouvement de la direction « dentelle ».
 * L'image apparaît d'abord à travers de petits jours en quinconce (comme à travers un tulle),
 * puis les jours s'agrandissent jusqu'à se rejoindre.
 *  - `ouverture` : image visible dès l'arrivée (premier écran), l'ajour joue au premier affichage,
 *    en CSS seul, sans attendre JavaScript ;
 *  - sinon : seules les images situées sous l'écran au chargement sont mises en attente, puis
 *    s'ajourent à leur arrivée. Sans JavaScript ou en animations apaisées, l'image est là, entière.
 */
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import s from "../da-dentelle.module.css";

export function Ajour({ children, ouverture = false, className = "" }: { children: React.ReactNode; ouverture?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fin = (e: AnimationEvent) => {
      if (e.target === el) el.dataset.ajour = "ouvert";
    };
    el.addEventListener("animationend", fin);
    if (ouverture || prefersReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) {
      return () => el.removeEventListener("animationend", fin);
    }
    el.dataset.ajour = "attente";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        el.dataset.ajour = "ouvre";
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeEventListener("animationend", fin);
    };
  }, [ouverture]);

  return (
    <div ref={ref} className={`${s.ajour} ${ouverture ? s.ajourOuverture : ""} ${className}`}>
      {children}
    </div>
  );
}
