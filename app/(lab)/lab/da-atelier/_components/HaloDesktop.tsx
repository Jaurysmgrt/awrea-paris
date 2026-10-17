"use client";
/**
 * Halo de lumière (MARQUE.md § 3) circonscrit selon l'arbitrage 1 : seulement sur les sections
 * noires, seulement avec une souris, jamais en mode apaisé. Au tactile et en mode apaisé, la
 * section reste noire et calme. Le halo lui-même est le composant partagé LightHalo.
 */
import { useSyncExternalStore } from "react";
import { LightHalo } from "@/components/signature/LightHalo";
import { prefersReducedMotion } from "@/lib/motion";
import { subscribePrefs } from "@/lib/prefs";

const QUERIES = ["(hover: hover) and (pointer: fine)", "(prefers-reduced-motion: reduce)"];

function subscribe(onChange: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  const off = subscribePrefs(onChange);
  return () => {
    lists.forEach((l) => l.removeEventListener("change", onChange));
    off();
  };
}
const snapshot = () => window.matchMedia(QUERIES[0]).matches && !prefersReducedMotion();
const serverSnapshot = () => false;

export function HaloDesktop({ intensity }: { intensity?: number }) {
  const on = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return on ? <LightHalo intensity={intensity} /> : null;
}
