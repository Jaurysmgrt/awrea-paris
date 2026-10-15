/**
 * Le guide des tailles en mètres rubans : une bande graduée au centimètre par mesure du corps
 * (poitrine, taille, hanches), sur une même échelle. Chaque taille proposée pour la pièce y est
 * posée à sa valeur, comme une épingle sur le ruban. On lit sa mesure, on voit sa taille.
 * Données : le guide des tailles de la Maison (content/settings.ts), seulement les tailles de la
 * pièce. Lisible au lecteur d'écran (listes « S, 84 cm »).
 */
import type { CSSProperties } from "react";
import type { Product } from "@/lib/commerce/types";
import { shop } from "@/content/settings";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

const cm = (v: string) => parseFloat(v.replace(",", "."));

export function MetreRuban({ product }: { product: Pick<Product, "variants"> }) {
  const sizes = new Set(product.variants.map((v) => v.size));
  const rows = shop.sizeGuide.rows.filter((r) => sizes.has(r[0] as Product["variants"][number]["size"]));
  // colonnes 2 à 4 : tour de poitrine, de taille, de hanches
  const mesures = [2, 3, 4].map((col) => ({
    nom: shop.sizeGuide.headers[col],
    marques: rows.map((r) => ({ taille: r[0], fr: r[1], valeur: cm(r[col]) })),
  }));
  const all = mesures.flatMap((m) => m.marques.map((x) => x.valeur));
  // une seule échelle pour les trois rubans, arrondie à la dizaine
  const min = Math.floor((Math.min(...all) - 4) / 10) * 10;
  const max = Math.ceil((Math.max(...all) + 4) / 10) * 10;
  const span = max - min;
  const pos = (v: number) => `${((v - min) / span) * 100}%`;
  const dizaines = Array.from({ length: span / 10 + 1 }, (_, k) => min + k * 10);

  return (
    <div className={styles.rubans} style={{ "--cm": span } as CSSProperties}>
      {mesures.map((m) => (
        <div key={m.nom} className={styles.ruban} role="group" aria-label={commun.signes.centimetres(m.nom)}>
          <p className={`t-label ${styles.rubanNom}`}>{m.nom}</p>
          <div className={styles.rubanBande}>
            <ul className={styles.rubanMarques}>
              {m.marques.map((x) => (
                <li key={x.taille} className={styles.rubanMarque} style={{ "--at": pos(x.valeur) } as CSSProperties}>
                  <span className={styles.rubanTaille}>{x.taille}</span>
                  <span className={styles.rubanValeur}>
                    {x.valeur}
                    <span className="sr-only">{" "}cm</span>
                  </span>
                </li>
              ))}
            </ul>
            <span className={styles.rubanGraduation} aria-hidden="true" />
            <span className={styles.rubanDizaines} aria-hidden="true">
              {dizaines.map((d) => (
                <span key={d} style={{ "--at": pos(d) } as CSSProperties}>
                  {d}
                </span>
              ))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
