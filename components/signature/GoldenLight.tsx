"use client";
/**
 * SIGNATURE 1 — La lumière dorée.
 * « La couleur n'est pas au rendez-vous mais la lumière de la dorure suffit à révéler l'essentiel. »
 * Sur les sections noires, le curseur diffuse un halo doré très doux qui révèle la dentelle
 * cachée dans le fond. Au tactile, la lumière suit le doigt puis dérive lentement d'elle-même.
 */
import { useEffect, useRef } from "react";
import { isTouch, prefersReducedMotion } from "@/lib/motion";

export function GoldenLight({ className, intensity = 1, active = true }: { className?: string; intensity?: number; active?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    if (!active) {
      el.dataset.on = "false";
      return;
    }
    // la texture de dentelle n'est téléchargée qu'à la première apparition de la lumière
    const turnOn = (on: boolean) => {
      el.dataset.on = on ? "true" : "false";
      if (on) el.dataset.armed = "true";
    };
    const reduced = prefersReducedMotion();
    const touch = isTouch();
    const target = { x: 0.62, y: 0.4 };
    const pos = { ...target };
    let pointerActive = false;
    let visible = false;
    let raf = 0;
    let lastTouch = 0;
    const t0 = performance.now();

    const set = () => {
      el.style.setProperty("--mx", `${(pos.x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(pos.y * 100).toFixed(2)}%`);
    };
    set();
    if (reduced) {
      turnOn(true);
      return;
    }

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      const idle = touch && now - lastTouch > 1800;
      if (idle || (!pointerActive && !touch)) {
        // dérive lente, comme une bougie qui bouge à peine
        const t = (now - t0) / 1000;
        target.x = 0.5 + Math.sin(t * 0.21) * 0.28 + Math.sin(t * 0.07) * 0.08;
        target.y = 0.45 + Math.cos(t * 0.17) * 0.22;
      }
      pos.x += (target.x - pos.x) * 0.06;
      pos.y += (target.y - pos.y) * 0.06;
      set();
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = (e.clientY - r.top) / r.height;
      pointerActive = true;
      if (e.pointerType !== "mouse") lastTouch = performance.now();
      turnOn(true);
      kick();
    };
    const onLeave = () => {
      pointerActive = false;
      kick();
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      turnOn(visible);
      kick();
    });
    io.observe(host);
    // texture chargée un peu avant que la section n'entre à l'écran
    const armIo = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.armed = "true";
        armIo.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    armIo.observe(host);
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerdown", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      armIo.disconnect();
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [active]);

  return (
    <div ref={ref} className={`golden-light ${className ?? ""}`} style={{ "--gl-intensity": intensity } as React.CSSProperties} aria-hidden="true">
      <div className="golden-light__lace" />
      <div className="golden-light__halo" />
    </div>
  );
}
