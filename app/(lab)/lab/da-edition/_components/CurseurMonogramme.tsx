"use client";
/**
 * Curseur monogramme (MARQUE.md § 3, arbitrage n° 1) : au-dessus des seules photographies de
 * dentelle (zones marquées data-curseur="aw"), le pointeur devient un petit « AW » qui suit la
 * souris sans retard. Partout ailleurs, le pointeur du système. Rien au tactile, rien en animations
 * apaisées : le composant ne s'active pas.
 */
import { useEffect, useRef } from "react";
import { monogramPaths } from "@/content/brand/logo-paths";
import { prefersReducedMotion } from "@/lib/motion";
import s from "../da-edition.module.css";

export function CurseurMonogramme() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion()) return;
    const root = document.documentElement;
    root.dataset.curseurAw = "actif";
    let frame = 0;
    const move = (e: PointerEvent) => {
      const zone = e.pointerType === "mouse" ? (e.target as Element | null)?.closest?.("[data-curseur='aw']") : null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.dataset.on = zone ? "true" : "false";
        if (zone) el.style.transform = `translate3d(${e.clientX - el.offsetWidth / 2}px, ${e.clientY - el.offsetHeight / 2}px, 0)`;
      });
    };
    const leave = () => (el.dataset.on = "false");
    document.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      delete root.dataset.curseurAw;
    };
  }, []);

  return (
    <div ref={ref} className={s.curseur} aria-hidden="true" data-on="false">
      <svg viewBox={monogramPaths.viewBox}>
        <path d={monogramPaths.aw} />
      </svg>
    </div>
  );
}
