/**
 * Numéro d'édition, signature de la Maison : « N° 3 / 5 » en Instrument Serif, puis la série
 * entière en crans (un cran par exemplaire, comme les repères d'assemblage d'un patron).
 * Les exemplaires déjà attribués sont pleins, le prochain est souligné d'un point de couture,
 * les suivants restent ouverts. Un fait, dit calmement : jamais de compte à rebours, jamais de couleur d'alerte.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Product } from "@/lib/commerce/types";
import { editionInfo } from "@/lib/commerce/availability";
import { numero } from "./typo";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export function EditionSerie({ product, size = "giant", withPhrase = true, aside }: { product: Pick<Product, "edition">; size?: "giant" | "fiche" | "row"; withPhrase?: boolean; aside?: ReactNode }) {
  const ed = editionInfo(product);
  const T = commun.serie;
  const label = ed.unique ? T.unique : ed.complete ? T.complete(ed.total) : T.numero(ed.nextNumber, ed.total);
  return (
    <div className={styles.edition} data-size={size}>
      <div className={styles.editionLigne}>
        <p className={`t-left ${styles.editionNo}`}>
          <span aria-hidden="true">{ed.unique ? T.unique : ed.complete ? numero(ed.total, ed.total) : numero(ed.nextNumber, ed.total)}</span>
          <span className="sr-only">{label}</span>
        </p>
        {aside}
      </div>
      {ed.unique ? null : (
        <ol className={styles.serie} aria-label={T.liste(ed.total)} style={{ "--n": ed.total } as CSSProperties}>
          {Array.from({ length: ed.total }, (_, k) => k + 1).map((n) => {
            const etat = n <= ed.produced ? "attribue" : n === ed.nextNumber && !ed.complete ? "prochain" : "libre";
            return (
              <li key={n} className={styles.cran} data-etat={etat}>
                <span className={styles.cranNum}>{n}</span>
                <span className="sr-only">{etat === "attribue" ? T.attribue : etat === "prochain" ? T.prochain : T.libre}</span>
              </li>
            );
          })}
        </ol>
      )}
      {withPhrase ? <p className={`t-note t-left ${styles.editionPhrase}`}>{T.phrase(ed.total, ed.produced)}</p> : null}
    </div>
  );
}
