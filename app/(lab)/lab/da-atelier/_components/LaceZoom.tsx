"use client";
/**
 * La dentelle de près : l'image du détail, découpée en bas en feston comme un bord de dentelle,
 * s'agrandit au clic ou au toucher (jamais au survol), dans une fenêtre que l'on ferme au clavier
 * (Échap), par le bouton ou en touchant le fond. L'image en grand n'est téléchargée qu'à la
 * première ouverture.
 */
import { useRef, useState } from "react";
import type { Image } from "@/lib/commerce/types";
import { Media, srcSet } from "@/components/ui/Media";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export function LaceZoom({ image, title, cta }: { image: Image; title: string; cta: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [armed, setArmed] = useState(false);
  const show = () => {
    setArmed(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  return (
    <div className={styles.zoom}>
      <button type="button" className={styles.zoomImage} onClick={show} aria-haspopup="dialog" data-curseur>
        <Media image={image} ratio="landscape" sizes="(min-width: 64rem) 50vw, 100vw" className={styles.festonMask} imgClassName={styles.zoomCrop} />
        <span className="sr-only">{cta}</span>
      </button>
      <div className={styles.zoomCta}>
        <button type="button" className="link" onClick={show} aria-haspopup="dialog">
          {cta}
        </button>
      </div>
      <dialog ref={dialog} className={styles.zoomDialog} aria-label={title} onClick={(e) => e.target === dialog.current && close()}>
        <div className={styles.zoomSheet}>
          {armed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={srcSet(image.src).src} alt={image.alt} width={image.width} height={image.height} className={styles.zoomFull} decoding="async" />
          ) : null}
          <button type="button" className={`link ${styles.zoomClose}`} onClick={close}>
            {commun.signes.fermer}
          </button>
        </div>
      </dialog>
    </div>
  );
}
