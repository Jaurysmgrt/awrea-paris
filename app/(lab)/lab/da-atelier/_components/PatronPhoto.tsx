/**
 * Une vraie photographie posée sur la table de coupe comme une pièce de patron :
 *  - un trait de coupe à 8 px de l'image ;
 *  - des crans sur le trait, un seul pour une vue de devant, deux pour une vue de dos, comme sur
 *    les patrons ;
 *  - le droit-fil dans la marge ;
 *  - des renvois lettrés posés sur la pièce (A, B…), expliqués dans la légende ;
 *  - une cote hors de l'image (la traîne, par exemple).
 * L'image reste une œuvre : rien ne la traverse, les renvois sont de petits points.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { SecretPin, type Secret } from "./SecretPin";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

export interface Repere {
  lettre: string;
  /** position sur l'image, en % de la largeur et de la hauteur */
  x: number;
  y: number;
  texte: string;
}

type Props = {
  image: Image;
  sizes: string;
  priority?: boolean;
  vue: "devant" | "dos";
  droitFil?: boolean;
  reperes?: Repere[];
  cote?: { from: number; to: number; texte: string };
  secret?: Secret;
  legende?: ReactNode;
  className?: string;
};

export function PatronPhoto({ image, sizes, priority, vue, droitFil, reperes = [], cote, secret, legende, className }: Props) {
  return (
    <figure className={`${styles.patron} ${className ?? ""}`}>
      <div className={styles.patronFrame} data-vue={vue}>
        <div className={styles.patronImage} data-curseur>
          <Media image={image} ratio="portrait" sizes={sizes} priority={priority} />
        </div>
        {reperes.map((r) => (
          <span key={r.lettre} className={styles.repere} style={{ "--x": `${r.x}%`, "--y": `${r.y}%` } as CSSProperties} aria-hidden="true">
            {r.lettre}
          </span>
        ))}
        {secret ? <SecretPin secret={secret} /> : null}
        {droitFil ? (
          <span className={styles.droitFil} aria-hidden="true">
            <span className={styles.droitFilLabel}>{commun.signes.droitFil}</span>
          </span>
        ) : null}
        {cote ? (
          <span className={styles.coteV} style={{ "--from": `${cote.from}%`, "--to": `${cote.to}%` } as CSSProperties} aria-hidden="true">
            <span className={styles.coteVLabel}>{cote.texte}</span>
          </span>
        ) : null}
      </div>
      {reperes.length || legende || cote ? (
        <figcaption className={styles.patronCaption}>
          {/* la cote se lit dans la marge sur grand écran ; ailleurs, et pour les lecteurs d'écran, ici */}
          {cote ? <span className={styles.coteTexte}>{cote.texte}</span> : null}
          {reperes.length ? (
            <ol className={styles.reperes}>
              {reperes.map((r) => (
                <li key={r.lettre}>
                  <span className={styles.repereKey} aria-hidden="true">
                    {r.lettre}
                  </span>
                  <span>{r.texte}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {legende ? <span className={`t-label t-soft ${styles.patronLegende}`}>{legende}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
