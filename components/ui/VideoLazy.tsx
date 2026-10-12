"use client";
/**
 * Vidéo muette en boucle, chargée paresseusement :
 * - la source n'est attachée qu'à l'approche de l'écran (ou tout de suite si `priority`) ;
 * - version allégée sur mobile ; image de remplacement tant que la vidéo n'est pas prête ;
 * - pause hors écran, pas de lecture automatique si « mouvement réduit » ou « économie de données » ;
 * - bouton lecture / pause accessible (WCAG 2.2.2).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./Icon";
import { prefersReducedMotion } from "@/lib/motion";

export type VideoSources = { src: string; mobileSrc?: string; poster: string; mobilePoster?: string };

type Props = VideoSources & {
  label: string;
  priority?: boolean;
  className?: string;
  controls?: boolean;
  onReady?: () => void;
};

export const VideoLazy = forwardRef<HTMLVideoElement | null, Props>(function VideoLazy(
  { src, mobileSrc, poster, mobilePoster, label, priority, className, controls = true, onReady },
  forwarded,
) {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwarded, () => ref.current as HTMLVideoElement);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const userPaused = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(max-width: 47.99rem)").matches);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const allowAutoplay = !prefersReducedMotion() && !saveData;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = isMobile && mobileSrc ? mobileSrc : src;
      v.load();
    };
    if (priority) load();
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          load();
          if (allowAutoplay && !userPaused.current) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src, mobileSrc, isMobile, priority]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <div className={`video ${className ?? ""}`} data-ready={ready}>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload={priority ? "auto" : "none"}
        poster={isMobile && mobilePoster ? mobilePoster : poster}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={() => {
          setReady(true);
          onReady?.();
        }}
      />
      {controls ? (
        <button type="button" className="video__toggle icon-btn" onClick={toggle} aria-label={playing ? `Mettre en pause : ${label}` : `Lire : ${label}`}>
          <Icon name={playing ? "pause" : "play"} />
        </button>
      ) : null}
    </div>
  );
});
