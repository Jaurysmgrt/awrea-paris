import { Logo } from "@/components/brand/Logo";
import { monogramPaths } from "@/content/brand/logo-paths";
import s from "../da-dentelle.module.css";

/**
 * Le monogramme AW serti d'un anneau de picots, comme un médaillon de dentelle.
 * Le monogramme lui-même est celui de la Maison (components/brand/Logo, fichier officiel dès
 * qu'il est fourni) ; seul l'anneau appartient à la direction « dentelle ».
 * Sert de logo (lisière), de curseur (au-dessus des images de dentelle), de filigrane (lettre,
 * pied de page) et d'écran d'ouverture (`trace` : l'anneau et le monogramme se dessinent d'un fil,
 * le long des tracés vectorisés du logo provisoire, content/brand/logo-paths.ts).
 */
const PICOTS = 24;
const points = Array.from({ length: PICOTS }, (_, i) => {
  const a = (i / PICOTS) * Math.PI * 2 - Math.PI / 2;
  return { x: (50 + 47.5 * Math.cos(a)).toFixed(2), y: (50 + 47.5 * Math.sin(a)).toFixed(2) };
});

export function Medaillon({ className = "", trace = false }: { className?: string; trace?: boolean }) {
  return (
    <span className={`${s.medaillon} ${trace ? s.medaillonTrace : ""} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className={s.medaillonAnneau}>
        <circle cx="50" cy="50" r="43" pathLength={1} className={s.medaillonCercle} />
        <g className={s.medaillonPicots}>
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.3" style={{ "--i": i } as React.CSSProperties} />
          ))}
        </g>
      </svg>
      {trace ? (
        <svg viewBox={monogramPaths.viewBox} className={s.medaillonAW}>
          <path d={monogramPaths.aw} pathLength={1} />
        </svg>
      ) : (
        <Logo variant="monogram" decorative className={s.medaillonAW} />
      )}
    </span>
  );
}
