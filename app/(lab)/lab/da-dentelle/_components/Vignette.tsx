"use client";
/**
 * Une pièce de la collection, comme un motif posé sur le réseau : sa première image (qui montre
 * déjà la matière), son numéro d'édition, sa série en picots, son prix.
 * Vidéo au survol (arbitrage 3c), révélée à travers les jours d'un tulle et non par un fondu ;
 * seulement avec une souris, jamais en animations apaisées. Rien ne dépend d'elle : tout est
 * déjà dit sans survol.
 */
import Link from "@/components/ui/Link";
import { useEffect, useRef } from "react";
import { dur, prefersReducedMotion } from "@/lib/motion";
import s from "../da-dentelle.module.css";

export function Vignette({ href, video, media, legende }: { href: string; video?: string; media: React.ReactNode; legende: React.ReactNode }) {
  const boite = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = boite.current;
    const v = film.current;
    if (!el || !v || !video || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let pause = 0;
    const entre = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
      window.clearTimeout(pause);
      if (!v.getAttribute("src")) v.src = video;
      v.play().catch(() => {});
      el.dataset.video = "on";
    };
    const sort = () => {
      el.dataset.video = "off";
      // la vidéo s'arrête quand les jours se sont refermés
      pause = window.setTimeout(() => v.pause(), dur() * 1000);
    };
    el.addEventListener("pointerenter", entre);
    el.addEventListener("pointerleave", sort);
    return () => {
      window.clearTimeout(pause);
      el.removeEventListener("pointerenter", entre);
      el.removeEventListener("pointerleave", sort);
    };
  }, [video]);

  return (
    <Link href={href} className={s.vignette}>
      <div ref={boite} className={s.vignetteMedia} data-curseur-aw="">
        {media}
        {video ? <video ref={film} className={s.vignetteVideo} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} /> : null}
      </div>
      {legende}
    </Link>
  );
}
