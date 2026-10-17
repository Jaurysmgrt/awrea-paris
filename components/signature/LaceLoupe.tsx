"use client";
/**
 * SIGNATURE 6 — Loupe dentelle.
 * Une loupe circulaire suit le curseur et grossit le détail de la dentelle.
 * Au tactile : appui long pour faire apparaître la loupe, puis glisser le doigt.
 * Au clavier : le bouton « Voir le détail en grand » ouvre l'image agrandie.
 */
import { useEffect, useRef, useState } from "react";
import type { Image } from "@/lib/commerce/types";
import { Media, srcSet } from "@/components/ui/Media";
import { Icon } from "@/components/ui/Icon";

const ZOOM = 2.6;

export function LaceLoupe({ image, hint = true }: { image: Image; hint?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [on, setOn] = useState(false);
  const full = srcSet(image.src).src;

  useEffect(() => {
    const el = ref.current;
    const l = lens.current;
    if (!el || !l) return;
    let pressTimer = 0;
    let touchActive = false;

    const place = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - r.left, 0), r.width);
      const y = Math.min(Math.max(clientY - r.top, 0), r.height);
      l.style.setProperty("--lx", `${x}px`);
      l.style.setProperty("--ly", `${y}px`);
      l.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
      l.style.backgroundPosition = `${-(x * ZOOM - l.offsetWidth / 2)}px ${-(y * ZOOM - l.offsetHeight / 2)}px`;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        setOn(true);
        place(e.clientX, e.clientY);
      } else if (touchActive) {
        e.preventDefault();
        place(e.clientX, e.clientY);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        touchActive = true;
        el.dataset.touch = "true";
        setOn(true);
        place(e.clientX, e.clientY);
      }, 260);
    };
    const end = () => {
      window.clearTimeout(pressTimer);
      touchActive = false;
      el.dataset.touch = "false";
      setOn(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchActive) e.preventDefault();
      else window.clearTimeout(pressTimer);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerleave", end);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("contextmenu", (e) => touchActive && e.preventDefault());
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", end);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <figure className="loupe">
      <div ref={ref} className="loupe__stage" data-on={on}>
        <Media image={image} ratio="portrait" sizes="(min-width: 64rem) 50vw, 100vw" />
        <div ref={lens} className="loupe__lens" aria-hidden="true" style={{ backgroundImage: `url(${full})` }} />
      </div>
      <figcaption className="loupe__caption">
        {hint ? (
          <span className="t-note">
            <span className="loupe__hint-pointer">Survolez l’image pour voir la dentelle de près.</span>
            <span className="loupe__hint-touch">Appuyez longuement sur l’image pour faire apparaître la loupe.</span>
          </span>
        ) : null}
        <button type="button" className="link link--quiet" onClick={() => dialog.current?.showModal()}>
          Voir le détail en grand
        </button>
      </figcaption>
      <dialog ref={dialog} className="zoom-dialog" aria-label={image.alt} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <button type="button" className="icon-btn zoom-dialog__close" onClick={() => dialog.current?.close()} aria-label="Fermer">
          <Icon name="close" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={full} alt={image.alt} loading="lazy" />
      </dialog>
    </figure>
  );
}
