"use client";
/**
 * Le détail inattendu de la fiche : une épingle plantée dans la dentelle. Au survol, au clavier
 * ou au toucher, elle déplie un mot de la créatrice, tiré de son carnet de collection.
 * Bouton réel (aria-expanded), note annoncée par aria-describedby ; aucun mouvement en mode apaisé.
 */
import { useId, useState, type CSSProperties } from "react";
import { Epingle } from "./Traits";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export interface Secret {
  x: number;
  y: number;
  citation: string;
  signature: string;
}

export function SecretPin({ secret }: { secret: Secret }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.secret} data-open={open} style={{ "--x": `${secret.x}%`, "--y": `${secret.y}%` } as CSSProperties}>
      <button type="button" className={styles.secretBtn} aria-expanded={open} aria-describedby={id} onClick={() => setOpen((v) => !v)} onBlur={() => setOpen(false)}>
        <Epingle />
        <span className="sr-only">{commun.signes.noteEpinglee}</span>
      </button>
      <span id={id} role="tooltip" className={styles.secretNote}>
        <span className={styles.secretQuote}>{`«\u00a0${secret.citation}\u00a0»`}</span>
        <span className="t-label t-soft">{secret.signature}</span>
      </span>
    </span>
  );
}
