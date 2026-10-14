import { imageAt } from "@/lib/media";
import s from "../da-dentelle.module.css";

/**
 * Le détail inattendu de la fiche : une chute de dentelle épinglée au bas de la page, découpée
 * en suivant le motif, le bas festonné. La photographie est celle de la table de coupe de
 * l'atelier ; la légende reprend ce que la Maison dit déjà (content/fr/pages.ts).
 * Contour en unités relatives (objectBoundingBox), de 0 à 1.
 */
function contour(): string {
  // six festons, de droite à gauche
  const festons = Array.from({ length: 6 }, (_, i) => {
    const xa = 0.92 - i * 0.14;
    const xb = xa - 0.14;
    return `Q${((xa + xb) / 2).toFixed(3)} 1 ${xb.toFixed(3)} 0.93`;
  }).join(" ");
  return [
    "M0.06 0.12 C0.18 0.02 0.3 0.1 0.42 0.05 C0.55 0 0.7 0.08 0.82 0.03",
    "C0.9 0.02 0.97 0.1 0.95 0.2 C0.92 0.34 0.99 0.46 0.95 0.6 C0.92 0.72 0.97 0.84 0.92 0.93",
    festons,
    "C0.04 0.8 0.09 0.66 0.05 0.52 C0.02 0.38 0.08 0.26 0.06 0.12 Z",
  ].join(" ");
}

export function Chute({ texte }: { texte: string }) {
  return (
    <figure className={s.chuteFigure}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" className={s.chuteDefs}>
        <defs>
          <clipPath id="da-dentelle-chute" clipPathUnits="objectBoundingBox">
            <path d={contour()} />
          </clipPath>
        </defs>
      </svg>
      <div className={s.chuteMedia}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageAt("/media/img/atelier-5", 480)} width={480} height={480} alt="Fragment de dentelle ivoire, découpé en suivant le motif" loading="lazy" decoding="async" />
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {/* l'épingle */}
          <path d="M20 26 L52 12" className={s.chuteEpingle} />
          <circle cx="18" cy="27" r="2.6" className={s.chuteTete} />
        </svg>
      </div>
      <figcaption className="t-note">{texte}</figcaption>
    </figure>
  );
}
