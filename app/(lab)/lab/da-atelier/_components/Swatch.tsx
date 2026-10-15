/**
 * L'échantillon : un carré de la vraie dentelle (photographie de la pièce), coupé aux ciseaux
 * cranteurs et épinglé au cartouche, comme on agrafe la matière à une fiche d'atelier.
 * C'est un lien vers la matière de la pièce ; le curseur monogramme s'y pose.
 */
import type { CSSProperties } from "react";
import type { Image } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { Epingle } from "./Traits";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

/** Bord cranté (zigzag) sur les quatre côtés, en pourcentages : `n` dents par côté. */
function pinked(n = 12, depth = 3): string {
  const pts: string[] = [];
  const step = 100 / n;
  const r = (v: number) => Math.round(v * 100) / 100;
  for (let i = 0; i < n; i++) pts.push(`${r(i * step)}% ${i % 2 ? depth : 0}%`, `${r(i * step + step / 2)}% ${i % 2 ? 0 : depth}%`);
  for (let i = 0; i < n; i++) pts.push(`${100 - (i % 2 ? depth : 0)}% ${r(i * step)}%`, `${100 - (i % 2 ? 0 : depth)}% ${r(i * step + step / 2)}%`);
  for (let i = 0; i < n; i++) pts.push(`${r(100 - i * step)}% ${100 - (i % 2 ? depth : 0)}%`, `${r(100 - i * step - step / 2)}% ${100 - (i % 2 ? 0 : depth)}%`);
  for (let i = 0; i < n; i++) pts.push(`${i % 2 ? depth : 0}% ${r(100 - i * step)}%`, `${i % 2 ? 0 : depth}% ${r(100 - i * step - step / 2)}%`);
  return `polygon(${pts.join(", ")})`;
}
const PINKED = pinked();

export function Swatch({ image, href, matiere }: { image: Image; href: string; matiere: string }) {
  return (
    <a href={href} className={styles.swatch} data-curseur>
      <span className={styles.swatchCut} style={{ clipPath: PINKED } as CSSProperties}>
        <Media image={image} ratio="auto" sizes="8rem" decorative imgClassName={styles.swatchImg} />
      </span>
      <Epingle className={styles.swatchPin} />
      <span className={`t-label ${styles.swatchLabel}`}>{commun.signes.echantillon}</span>
      <span className="sr-only">{`${matiere}, ${commun.signes.voirMatiere}`}</span>
    </a>
  );
}
