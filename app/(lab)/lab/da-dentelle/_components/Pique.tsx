import { Fragment } from "react";
import s from "../da-dentelle.module.css";

/**
 * Titre piqué le long d'un fil (arbitrage 3a) : un fil avance de gauche à droite sous le titre,
 * chaque lettre apparaît au passage de l'aiguille, un picot ferme la couture.
 * Animation CSS seule ; le titre entier est lu d'un trait par les lecteurs d'écran.
 */
export function Pique({ texte, lu, as: Tag = "h1", id, className = "" }: { texte: string; lu?: string; as?: "h1" | "h2"; id?: string; className?: string }) {
  const n = texte.replace(/ /g, "").length;
  let i = 0;
  return (
    <Tag id={id} className={`${s.pique} ${className}`}>
      <span className="sr-only">{lu ?? texte}</span>
      <span aria-hidden="true">
        {texte.split(" ").map((mot, m) => (
          <Fragment key={m}>
            {m ? " " : null}
            <span className={s.piqueMot}>
              {Array.from(mot).map((c) => (
                <span key={i} className={s.piqueLettre} style={{ "--i": i++, "--n": n } as React.CSSProperties}>
                  {c}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
