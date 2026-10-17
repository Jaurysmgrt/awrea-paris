/**
 * Miroir TypeScript des couleurs de styles/tokens.css, pour les contextes sans CSS :
 * métadonnées, e-mails, images Open Graph, shaders WebGL.
 * `npm run audit:tokens` vérifie que ces valeurs restent identiques au CSS.
 */
export const palette = {
  ink: "#0a0a0a", // noir
  ivory: "#f7f6f3", // blanc cassé
  pearl: "#e4e2dd", // gris pierre
  taupe: "#8c8780", // gris taupe (grands textes, fonds noirs)
  taupeDeep: "#66635e", // taupe des petits textes sur fond clair (contraste AA)
} as const;

/** Deux familles, pas une de plus (e-mails : repli sur des polices système proches). */
export const fontStacks = {
  display: "'Instrument Serif', 'Times New Roman', Georgia, serif",
  sans: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

/** RGB normalisé 0–1, pour les uniformes de shaders */
export function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
