"use client";
/**
 * Vignette vidéo au survol d'une carte produit (ordinateur seulement) : la vidéo n'est
 * téléchargée qu'au premier survol, se fond par-dessus l'image dès qu'elle joue, puis se met
 * en pause en quittant la carte. Rien sur écran tactile, en économie de données ou si les
 * animations sont apaisées. Décorative : muette, sans contrôles, ignorée des lecteurs d'écran.
 */
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export function CardVideo({ src }: { src: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hovering = useRef(false);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const card = box.current?.closest<HTMLElement>(".product-card__link");
    if (!card || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) return;
    const enter = () => {
      if (prefersReducedMotion()) return;
      hovering.current = true;
      setArmed(true);
      video.current?.play().catch(() => {});
    };
    const leave = () => {
      hovering.current = false;
      video.current?.pause();
      setPlaying(false);
    };
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span ref={box} className="card-video" data-playing={playing} aria-hidden="true">
      {armed ? (
        <video
          ref={video}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          tabIndex={-1}
          onPlaying={() => (hovering.current ? setPlaying(true) : video.current?.pause())}
        />
      ) : null}
    </span>
  );
}
