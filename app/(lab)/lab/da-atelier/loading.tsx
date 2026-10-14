/**
 * Chargement (MARQUE.md § 3, monogramme décliné en signature) : pendant que la page se prépare,
 * le « AW » du logo se dessine d'un trait noir fin, aller puis retour, sur la même durée que
 * toutes les animations. En mode apaisé, le monogramme est simplement posé.
 */
import { Monogramme } from "./_components/Traits";
import { commun } from "./_components/textes";
import styles from "./da-atelier.module.css";

export default function Chargement() {
  return (
    <div className={styles.loading} role="status">
      <Monogramme draw className={styles.loadingMark} />
      <span className="sr-only">{commun.signes.chargement}</span>
    </div>
  );
}
