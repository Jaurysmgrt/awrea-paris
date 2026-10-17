"use client";
/**
 * Vidéo au survol (arbitrage 3c) : sur ordinateur, quand la souris se pose sur une ligne du
 * registre, le mouvement de la pièce apparaît d'abord à travers les fils d'une dentelle, puis
 * la dentelle s'ouvre et laisse toute l'image. Deux temps de la même durée (--dur).
 * Téléchargée au premier survol seulement ; rien au tactile, en économie de données ni en mode
 * apaisé. Décorative : muette, sans contrôles, ignorée des lecteurs d'écran (la photo dit tout).
 */
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "../da-atelier.module.css";

export function LaceVideo({ src }: { src: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hovering = useRef(false);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const row = box.current?.closest<HTMLElement>("[data-row]");
    if (!row || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
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
    row.addEventListener("pointerenter", enter);
    row.addEventListener("pointerleave", leave);
    return () => {
      row.removeEventListener("pointerenter", enter);
      row.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span ref={box} className={styles.laceVideo} data-playing={playing} aria-hidden="true">
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
