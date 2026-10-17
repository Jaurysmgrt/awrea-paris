import s from "../da-dentelle.module.css";

/**
 * Croquis de la robe Odessa, de dos, au trait noir très fin, annoté comme une feuille de
 * patronage : chaque note est reliée au dessin par une bride (la barrette qui relie les motifs
 * d'une dentelle) terminée par un picot sur le point exact.
 *
 * TRACÉ PROVISOIRE (arbitrage 8 : « authenticité d'abord ») : à remplacer par le croquis scanné
 * de la créatrice dès qu'il est fourni. Les notes ne disent que ce que la fiche de la pièce dit
 * déjà (détails, doublure, coupe, composition) ; rien n'est inventé.
 * Coordonnées : unités internes du viewBox (360 × 560) ; le dessin (tracé sur 320 de large) est
 * décalé de DX pour laisser aux notes une marge égale de chaque côté.
 */
const L = 360;
const H = 560;
const DX = 20;

type Note = { x: number; y: number; lx: number; ly: number; cote: "gauche" | "droite"; titre: string; texte: string };

/** notes posées dans les marges (gauche : bord droit à x = 88 ; droite : bord gauche à x = 272) */
const NOTES: Note[] = [
  { x: 105, y: 182, lx: 88, ly: 150, cote: "gauche", titre: "Manches", texte: "Longues, en dentelle" },
  { x: 184, y: 170, lx: 272, ly: 140, cote: "droite", titre: "Bustier", texte: "Doublé de satin de soie" },
  { x: 160, y: 198, lx: 272, ly: 214, cote: "droite", titre: "Dos", texte: "Laçage de satin, œillets cousus main" },
  { x: 130, y: 384, lx: 88, ly: 384, cote: "gauche", titre: "Ligne", texte: "Épouse la silhouette jusqu’aux genoux" },
  { x: 182, y: 420, lx: 272, ly: 420, cote: "droite", titre: "Dentelle", texte: "Florale, coton et polyamide" },
  { x: 210, y: 541, lx: 272, ly: 500, cote: "droite", titre: "Traîne", texte: "30 cm, souple : elle suit vos pas" },
].map((n) => ({ ...n, x: n.x + DX }) as Note);

const SILHOUETTE = [
  // chignon et tête, de dos
  "M149 20 C149 13 155 9 160 9 C165 9 171 13 171 20 C171 27 165 30 160 30 C155 30 149 27 149 20 Z",
  "M150 15 C146 8 155 3 160 8 C165 3 174 8 170 15",
  "M146 46 C146 34 152 28 160 28 C168 28 174 34 174 46 C174 56 169 64 160 64 C151 64 146 56 146 46 Z",
  // cou et épaules
  "M153 62 C153 70 152 76 151 82",
  "M167 62 C167 70 168 76 169 82",
  "M151 82 C140 86 126 88 116 96",
  "M169 82 C180 86 194 88 204 96",
  // manches longues en dentelle
  "M116 96 C108 120 104 148 104 178 C104 206 106 232 110 256",
  "M127 132 C123 158 121 186 121 212 C121 230 122 244 124 254",
  "M110 256 C113 262 121 262 124 254",
  "M204 96 C212 120 216 148 216 178 C216 206 214 232 210 256",
  "M193 132 C197 158 199 186 199 212 C199 230 198 244 196 254",
  "M210 256 C207 262 199 262 196 254",
  // décolleté dos
  "M120 102 C124 114 126 126 128 136 L192 136 C194 126 196 114 200 102",
  // bustier de satin
  "M128 156 C146 152 174 152 192 156",
  "M128 156 C130 180 132 204 134 230",
  "M192 156 C190 180 188 204 186 230",
  "M134 230 C146 234 154 237 160 239 C166 237 174 234 186 230",
  // jupe : ajustée jusqu'aux genoux, puis évasée
  "M134 230 C128 250 122 268 121 290 C120 318 124 350 130 384 C124 414 114 444 100 472 C92 488 84 502 76 516",
  "M186 230 C192 250 198 268 199 290 C200 318 196 350 190 384 C196 414 206 444 220 472 C228 488 236 502 244 516",
  "M76 516 C112 528 208 528 244 516",
  // traîne
  "M76 516 C92 536 124 550 160 552 C196 550 228 536 244 516",
  "M152 392 C148 430 142 470 132 524",
  "M168 392 C172 430 178 470 188 524",
];

/** laçage : deux rangs d'œillets, le lacet croisé entre eux */
const OEILLETS = Array.from({ length: 9 }, (_, i) => 162 + i * 8);
const LACET = OEILLETS.slice(0, -1)
  .map((y) => `M155 ${y} L165 ${y + 8} M165 ${y} L155 ${y + 8}`)
  .join(" ");

/** motifs de la dentelle florale, à peine indiqués */
function fleur(cx: number, cy: number, r: number): string {
  let d = "";
  for (let k = 0; k < 5; k++) {
    const t = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    const tip = [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    const a = [cx + r * 0.9 * Math.cos(t - 0.55), cy + r * 0.9 * Math.sin(t - 0.55)];
    const b = [cx + r * 0.9 * Math.cos(t + 0.55), cy + r * 0.9 * Math.sin(t + 0.55)];
    d += `M${cx} ${cy} Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${tip[0].toFixed(1)} ${tip[1].toFixed(1)} Q${b[0].toFixed(1)} ${b[1].toFixed(1)} ${cx} ${cy} `;
  }
  return d;
}
const FLEURS = [
  [146, 300, 7],
  [178, 330, 6],
  [140, 352, 5],
  [182, 420, 7],
  [150, 468, 7],
  [116, 476, 5],
  [204, 492, 5],
  [111, 200, 4],
  [209, 168, 4],
  [208, 230, 3],
].map(([x, y, r]) => fleur(x, y, r));

function bride(n: Note): string {
  const fin = n.cote === "droite" ? n.lx - 4 : n.lx + 4;
  const coude = n.cote === "droite" ? n.lx - 16 : n.lx + 16;
  return n.y === n.ly ? `M${n.x} ${n.y} L${fin} ${n.ly}` : `M${n.x} ${n.y} L${coude} ${n.ly} L${fin} ${n.ly}`;
}

export function Croquis({ titre }: { titre: string }) {
  return (
    <figure className={s.croquis}>
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={titre}>
        <g transform={`translate(${DX} 0)`}>
          {SILHOUETTE.map((d, i) => (
            <path key={i} d={d} className={s.croquisTrait} />
          ))}
          <path d={LACET} className={s.croquisTrait} />
          {OEILLETS.flatMap((y) => [155, 165].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" className={s.croquisTrait} />))}
          {FLEURS.map((d, i) => (
            <path key={`f${i}`} d={d} className={s.croquisDentelle} />
          ))}
        </g>
        {NOTES.map((n) => (
          <g key={n.titre}>
            <path d={bride(n)} className={s.croquisBride} />
            <circle cx={n.x} cy={n.y} r="2.2" className={s.croquisPicot} />
          </g>
        ))}
      </svg>
      {NOTES.map((n) => (
        <figcaption
          key={n.titre}
          className={s.croquisNote}
          data-cote={n.cote}
          style={
            {
              top: `${(n.ly / H) * 100}%`,
              ...(n.cote === "droite" ? { left: `${(n.lx / L) * 100}%` } : { right: `${100 - (n.lx / L) * 100}%` }),
            } as React.CSSProperties
          }
        >
          <span className={s.croquisNoteTitre}>{n.titre}</span>
          {n.texte}
        </figcaption>
      ))}
    </figure>
  );
}
