"use client";
/**
 * Boutons magnétiques, discrets : sur ordinateur, les boutons principaux (or, plein, ou
 * marqués data-magnetic) se laissent attirer de quelques pixels par le curseur, puis
 * reviennent en douceur. Une seule écoute déléguée pour tout le site ; rien sur écran
 * tactile, ni si les animations sont apaisées.
 */
import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// les boutons pleine largeur (formulaires) restent immobiles
const SELECTOR = ".btn--gold:not(.btn--block), .btn--solid:not(.btn--block), [data-magnetic]";
const PULL = 0.2; // part de la distance au centre
const MAX = 6; // déplacement maximal, en pixels

const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));

export function Magnetic() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let current: HTMLElement | null = null;
    let frame = 0;

    const release = (el: HTMLElement) => {
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      delete el.dataset.magnet;
    };

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(SELECTOR) ?? null;
      if (el !== current) {
        if (current) release(current);
        current = el;
      }
      if (!el || el.matches(":disabled, [aria-disabled='true']") || prefersReducedMotion()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.dataset.magnet = "on";
        el.style.setProperty("--mx", `${clamp((e.clientX - (r.left + r.width / 2)) * PULL)}px`);
        el.style.setProperty("--my", `${clamp((e.clientY - (r.top + r.height / 2)) * PULL)}px`);
      });
    };
    const onLeaveWindow = () => {
      if (current) release(current);
      current = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      if (current) release(current);
    };
  }, []);
  return null;
}
