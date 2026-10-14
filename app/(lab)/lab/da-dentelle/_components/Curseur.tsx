"use client";
/**
 * Curseur monogramme (MARQUE.md § 3, arbitrage 1) : le médaillon AW accompagne le pointeur
 * au-dessus des images de dentelle et des galeries seulement (zones marquées
 * `data-curseur-aw`). Le pointeur du système reste visible : le médaillon se pose à côté,
 * comme un cachet. Absent au tactile et en animations apaisées.
 */
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { Medaillon } from "./Medaillon";
import s from "../da-dentelle.module.css";

export function Curseur() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || prefersReducedMotion()) {
        el.dataset.on = "false";
        return;
      }
      const zone = (e.target as Element | null)?.closest?.("[data-curseur-aw]");
      el.dataset.on = zone ? "true" : "false";
      if (!zone) return;
      cancelAnimationFrame(frame);
      // position du pointeur (une donnée, pas une valeur de style) ; le décalage vient des tokens
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--cx", `${e.clientX}px`);
        el.style.setProperty("--cy", `${e.clientY}px`);
      });
    };
    const leave = () => {
      el.dataset.on = "false";
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={s.curseur} data-on="false" aria-hidden="true">
      <Medaillon />
    </div>
  );
}
