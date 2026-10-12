"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { prefersReducedMotion, setupGsap, ScrollTrigger, gsap } from "@/lib/motion";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

/** Défilement doux (Lenis) synchronisé avec GSAP ScrollTrigger. Coupé si mouvement réduit. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const raf = useRef<((t: number) => void) | null>(null);

  useEffect(() => {
    setupGsap();
    if (prefersReducedMotion()) return;
    const l = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3), touchMultiplier: 1.2, syncTouch: false });
    l.on("scroll", ScrollTrigger.update);
    raf.current = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(raf.current);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);
    (window as unknown as { __lenis?: Lenis }).__lenis = l;
    return () => {
      if (raf.current) gsap.ticker.remove(raf.current);
      l.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
