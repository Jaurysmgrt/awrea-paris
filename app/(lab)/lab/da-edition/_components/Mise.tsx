/**
 * Les pièces typographiques de la revue : le filet à picots (le bord d'une dentelle), le folio
 * (pied de page), le numéro d'édition en grand.
 */
import { edition, numero } from "./textes";
import s from "../da-edition.module.css";

/**
 * Filet à picots : un fil d'un pixel et, tous les 8 px, une petite boucle, comme le bord d'une
 * dentelle. Tracé en SVG (unités internes), couleur des filets du site.
 */
export function FiletPicot({ id }: { id: string }) {
  return (
    <svg className={s.picot} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0.5H8M1.5 0.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * Folio : le pied d'une page. À gauche, le numéro de la rubrique au sommaire (ou le numéro
 * d'édition d'une pièce) et son titre ; à droite, la revue. Purement visuel : le titre de la
 * section le dit déjà aux lecteurs d'écran.
 */
export function Folio({ id, numero: n, titre }: { id: string; numero: string; titre: string }) {
  return (
    <div className={s.folio} aria-hidden="true">
      <FiletPicot id={`picot-${id}`} />
      <div className={s.folioLigne}>
        <span className={s.folioGauche}>
          <span className={s.folioNumero}>{n}</span>
          <span className="t-label">{titre}</span>
        </span>
        <span className={`t-label ${s.folioDroite}`}>
          {numero.marque}, {numero.ligne}
        </span>
      </div>
    </div>
  );
}

/** Le numéro d'édition au format d'un titre : « N° », le numéro immense, « / 5 » plus petit. */
export function ChiffreEdition({ n, total, unique, className }: { n: number; total: number; unique: boolean; className?: string }) {
  if (unique) {
    return (
      <div className={`${s.chiffre} ${className ?? ""}`}>
        <span className={s.chiffreUnique}>{edition.unique}</span>
      </div>
    );
  }
  return (
    <div className={`${s.chiffre} ${className ?? ""}`}>
      <span aria-hidden="true" className={s.chiffreNo}>
        N°
      </span>
      <span aria-hidden="true" className={s.chiffreN}>
        {n}
      </span>
      <span aria-hidden="true" className={s.chiffreSur}>
        {"/ "}
        {total}
      </span>
      <span className="sr-only">{edition.lecteur(n, total)}</span>
    </div>
  );
}
