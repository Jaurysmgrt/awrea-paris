"use client";
/**
 * Le détail inattendu de l'accueil : dans une maille laissée à jour, un picot. Au survol, au
 * clavier ou au toucher, une phrase de la créatrice apparaît dans le jour (tirée de l'intention
 * de la collection, jamais inventée).
 */
import { useId, useState } from "react";
import s from "../da-dentelle.module.css";

export function JourMot({ phrase, signature, style }: { phrase: string; signature: string; style?: React.CSSProperties }) {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [epingle, setEpingle] = useState(false);
  const visible = ouvert || epingle;
  return (
    <li
      className={s.jourMot}
      data-ouvert={visible}
      style={style}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOuvert(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOuvert(false)}
    >
      <button
        type="button"
        className={s.jourPicot}
        aria-expanded={visible}
        aria-controls={id}
        onClick={() => setEpingle((v) => !v)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
      >
        <span className="sr-only">Un mot de la créatrice</span>
      </button>
      <blockquote id={id} className={s.jourCitation}>
        <p className={`${s.jourPhrase} ${s.sansJustif}`}>« {phrase} »</p>
        <footer className="t-label">{signature}</footer>
      </blockquote>
    </li>
  );
}
