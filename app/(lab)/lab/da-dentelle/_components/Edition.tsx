import { editionInfo } from "@/lib/commerce/availability";
import type { Product } from "@/lib/commerce/types";
import s from "../da-dentelle.module.css";

type Piece = Pick<Product, "edition">;

/** « N° 3 / 5 » en Instrument Serif, très grand : la signature de la Maison (MARQUE.md § 3). */
export function Edition({ product, className = "" }: { product: Piece; className?: string }) {
  const ed = editionInfo(product);
  const lu = ed.unique ? "Pièce unique" : ed.complete ? `Série complète de ${ed.total} pièces` : `Numéro ${ed.nextNumber} sur ${ed.total}`;
  return (
    <p className={`${s.edition} ${s.sansJustif} ${className}`}>
      <span className="sr-only">{lu}</span>
      {ed.unique ? (
        <span className={s.editionTotal} aria-hidden="true">
          Pièce unique
        </span>
      ) : (
        <span aria-hidden="true">
          <span className={s.editionNo}>N° </span>
          <span className={s.editionN}>{ed.complete ? ed.total : ed.nextNumber}</span>
          <span className={s.editionTotal}> / {ed.total}</span>
        </span>
      )}
    </p>
  );
}

/**
 * La série en picots, sur un fil : un picot plein par pièce déjà numérotée, un picot cerclé pour
 * le prochain numéro, un picot vide pour chaque pièce à venir. Un fait, dit calmement.
 */
export function Serie({ product, avecTexte = false }: { product: Piece; avecTexte?: boolean }) {
  const ed = editionInfo(product);
  const etat = (i: number) => (i < ed.produced ? "faite" : i === ed.produced ? "prochaine" : "a-venir");
  const lu = ed.unique
    ? "Pièce unique"
    : ed.complete
      ? `Série de ${ed.total} pièces, toutes numérotées`
      : `Série de ${ed.total} pièces : ${ed.produced} déjà numérotée${ed.produced > 1 ? "s" : ""}, la prochaine porte le numéro ${ed.nextNumber}`;
  const texte = ed.unique
    ? "Pièce unique, signée par la créatrice"
    : ed.complete
      ? `Série complète de ${ed.total} pièces`
      : `Série de ${ed.total} pièces · ${ed.remaining} à venir`;
  return (
    <span className={avecTexte ? s.serieLigne : undefined}>
      <span className={s.serie} role="img" aria-label={lu}>
        {Array.from({ length: ed.total }, (_, i) => (
          <span key={i} data-etat={etat(i)} />
        ))}
      </span>
      {avecTexte ? (
        <span className={`t-note ${s.serieTexte}`} aria-hidden="true">
          {texte}
        </span>
      ) : null}
    </span>
  );
}
