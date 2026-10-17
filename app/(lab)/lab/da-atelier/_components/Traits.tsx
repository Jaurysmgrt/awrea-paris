/**
 * Le système graphique de l'atelier : quelques signes de patronage, toujours au trait fin, chacun
 * avec un seul sens (voir la légende du pied de page).
 *  - Monogramme : le « AW » du logo (content/brand/logo-paths.ts), dessiné au trait.
 *  - Épingle : une note de l'atelier.
 *  - Cote : une mesure prise à l'atelier.
 *  - Feston : le bord de la dentelle, qui sépare les grands temps de la page.
 * Signes graphiques seulement : aucune illustration, aucune image dessinée à la place des
 * croquis de la créatrice (règle 6 de la créatrice).
 */
import type { ReactNode } from "react";
import { monogramPaths } from "@/content/brand/logo-paths";
import styles from "../da-atelier.module.css";

/** Le monogramme AW au trait (filigrane, signature, chargement). */
export function Monogramme({ className, draw = false }: { className?: string; draw?: boolean }) {
  return (
    <svg viewBox={monogramPaths.viewBox} className={`${styles.monogramme} ${className ?? ""}`} data-draw={draw || undefined} aria-hidden="true" focusable="false">
      <path d={monogramPaths.aw} pathLength={1} />
    </svg>
  );
}

/** Épingle à tête ronde, posée en biais. */
export function Epingle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 48" className={`${styles.epingle} ${className ?? ""}`} aria-hidden="true" focusable="false">
      <circle cx="12" cy="7" r="4.5" />
      <path d="M12 11.5 L12 46" />
    </svg>
  );
}

/** Cote horizontale : la ligne, ses deux traits obliques, la valeur au-dessus. */
export function Cote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`${styles.cote} ${className ?? ""}`}>
      <span className={styles.coteValue}>{children}</span>
      <span className={styles.coteLine} aria-hidden="true" />
    </span>
  );
}

/** Feston : séparateur en petits arcs, le bord d'une dentelle. */
export function Feston({ className }: { className?: string }) {
  return <div className={`${styles.feston} ${className ?? ""}`} aria-hidden="true" />;
}
