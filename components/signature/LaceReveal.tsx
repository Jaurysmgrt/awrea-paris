"use client";
/**
 * SIGNATURE 2 — Révélation en dentelle.
 * La vidéo d'ouverture apparaît d'abord à travers les seuls fils d'une dentelle,
 * puis le motif s'agrandit et s'ouvre jusqu'à laisser toute l'image à nu.
 * (masque CSS animé : motif dentelle + ouverture radiale ; supprimé en fin d'animation)
 */
import { useEffect, useRef } from "react";
import { VideoLazy, type VideoSources } from "@/components/ui/VideoLazy";
import { gsap, prefersReducedMotion, setupGsap, dur } from "@/lib/motion";

export function LaceReveal({ video, label, children }: { video: VideoSources; label: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.dataset.state = "open";
      return;
    }
    setupGsap();
    const s = { size: 220, open: 0 };
    const apply = () => {
      el.style.setProperty("--lace-size", `${s.size}px`);
      el.style.setProperty("--lace-open", `${s.open}%`);
    };
    apply();
    el.dataset.state = "masked";
    const d = dur("slow");
    const tl = gsap.timeline({ delay: 0.35, onUpdate: apply, onComplete: () => (el.dataset.state = "open") });
    tl.to(s, { size: 5200, duration: d * 2.2, ease: "drape" }, 0).to(s, { open: 140, duration: d * 1.7, ease: "silk" }, d * 0.7);
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={ref} className="lace-reveal" data-state="idle">
      <div className="lace-reveal__media">
        <VideoLazy {...video} label={label} priority className="lace-reveal__video" />
      </div>
      <div className="lace-reveal__veil" aria-hidden="true" />
      {children}
    </div>
  );
}
