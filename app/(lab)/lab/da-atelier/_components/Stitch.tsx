/**
 * Titre bâti (arbitrage 3a) : les lettres se posent l'une après l'autre le long d'un fil, et
 * chacune laisse sous elle un point de couture. Le fil de bâti reste ensuite, en tirets fins,
 * comme sur une toile encore à coudre.
 *
 * Animation CSS seule (aucun JavaScript), une seule durée (--dur) décalée de --dur-stagger,
 * neutralisée en mode apaisé. Les lecteurs d'écran lisent la phrase entière ; les lettres
 * animées leur sont masquées.
 */
import { Fragment, type CSSProperties } from "react";
import styles from "../da-atelier.module.css";

export function Stitch({ text }: { text: string }) {
  // index de la première lettre de chaque mot (calculé sans mutation pendant le rendu)
  const words = text.split(" ");
  const starts = words.map((_, w) => words.slice(0, w).reduce((n, word) => n + Array.from(word).length, 0));
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={styles.stitch}>
        {words.map((word, w) => (
          // l'espace reste hors du mot insécable : la ligne peut se couper entre deux mots
          <Fragment key={w}>
            {w ? " " : null}
            <span className={styles.stitchWord}>
              {Array.from(word).map((ch, c) => (
                <span key={c} className={styles.stitchChar} style={{ "--i": starts[w] + c } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
