/**
 * Emplacement réservé au croquis original de la créatrice (règle 6 : aucune image générée, des
 * emplacements vides élégants). Une feuille de patron prête : repères d'angle, droit-fil,
 * cartouche au nom de la pièce. Le scan du croquis prendra cette place telle quelle, au même
 * format que la photographie voisine.
 */
import { nomCommun } from "./typo";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export function CroquisVide({ piece, note }: { piece: string; note: string }) {
  return (
    <figure className={styles.croquisVide}>
      <div className={styles.feuille} role="img" aria-label={commun.signes.croquisPlace(nomCommun(piece))}>
        <span className={styles.feuilleCoins} aria-hidden="true" />
        <span className={styles.feuilleFil} aria-hidden="true" />
        <span className={styles.feuilleCartouche} aria-hidden="true">
          <span className="t-label">{piece}</span>
          <span className="t-label t-soft">{commun.signes.croquis}</span>
        </span>
      </div>
      <figcaption className={`t-note ${styles.feuilleNote}`}>{note}</figcaption>
    </figure>
  );
}
