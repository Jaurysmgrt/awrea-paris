/**
 * Le registre des éditions : la collection présentée comme l'atelier la tient, une ligne par
 * pièce, avec sa photographie, sa matière, son numéro et sa série en crans, son prix.
 * Ni grille de vignettes, ni carrousel : un ensemble fini, que l'on lit d'un trait.
 * Toute la ligne mène à la pièce (lien étiré sur le nom, seul nom accessible du lien).
 */
import Link from "@/components/ui/Link";
import { Media } from "@/components/ui/Media";
import type { Product } from "@/lib/commerce/types";
import { formatPrice } from "@/lib/format";
import { EditionSerie } from "./EditionSerie";
import { LaceVideo } from "./LaceVideo";
import { fr } from "./typo";
import styles from "../da-atelier.module.css";

export function Registre({ pieces, hrefOf }: { pieces: Product[]; hrefOf: (p: Product) => string }) {
  return (
    <ol className={styles.registre}>
      {pieces.map((p) => {
        const matiere = [...p.materials].sort((a, b) => b.percent - a.percent)[0]?.name ?? "";
        return (
          <li key={p.handle} className={styles.row} data-row>
            <div className={styles.rowMedia} data-curseur>
              <Media image={p.images[0]} ratio="tall" sizes="(min-width: 64rem) 16vw, 40vw" />
              {p.video ? <LaceVideo src={p.video.src} /> : null}
            </div>
            <div className={styles.rowName}>
              <h3 className={styles.rowTitle}>
                <Link href={hrefOf(p)} className={styles.rowLink}>
                  {p.title}
                </Link>
              </h3>
              <p className={`t-note t-left ${styles.rowMatiere}`}>{fr(matiere)}</p>
            </div>
            <div className={styles.rowEdition}>
              <EditionSerie product={p} size="row" withPhrase={false} />
            </div>
            <p className={`price ${styles.rowPrice}`}>{formatPrice(p.price)}</p>
          </li>
        );
      })}
    </ol>
  );
}
