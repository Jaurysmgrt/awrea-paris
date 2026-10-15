"use client";
/**
 * SIGNATURE 2 — Révélation en dentelle.
 * La vidéo d'ouverture apparaît d'abord à travers les seuls fils d'une dentelle,
 * puis le voile ajouré s'agrandit et s'efface jusqu'à laisser toute l'image à nu.
 * Animation CSS en transform/opacity (GPU) : elle démarre dès le premier affichage,
 * sans attendre JavaScript ; le voile est retiré du rendu à la fin.
 */
import { useEffect, useRef } from "react";
import { VideoLazy, type VideoSources } from "@/components/ui/VideoLazy";

export function LaceReveal({ video, label, children }: { video: VideoSources; label: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const lace = el?.querySelector<HTMLElement>(".lace-reveal__lace");
    if (!el || !lace) return;
    const open = (e?: AnimationEvent) => {
      if (!e || e.animationName === "lace-veil-fade") el.dataset.state = "open";
    };
    if (getComputedStyle(lace).animationName === "none") return open();
    lace.addEventListener("animationend", open);
    return () => lace.removeEventListener("animationend", open);
  }, []);

  return (
    <div ref={ref} className="lace-reveal" data-state="lace">
      <div className="lace-reveal__media">
        <VideoLazy {...video} label={label} priority className="lace-reveal__video" />
      </div>
      <div className="lace-reveal__lace" aria-hidden="true" />
      <div className="lace-reveal__veil" aria-hidden="true" />
      {children}
    </div>
  );
}
