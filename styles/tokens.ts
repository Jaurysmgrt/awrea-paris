/**
 * Miroir TypeScript des couleurs de styles/tokens.css, pour les contextes sans CSS :
 * métadonnées, e-mails, images Open Graph, shaders WebGL.
 * `npm run audit:tokens` vérifie que ces valeurs restent identiques au CSS.
 */
export const palette = {
  ink: "#0b0b0b",
  ivory: "#f4f1eb",
  pearl: "#d9d6d0",
  gold: "#b8955a",
} as const;

export const fontStacks = {
  display: "'Bodoni Moda', 'Bodoni 72', Didot, serif",
  serif: "'Cormorant Garamond', Cormorant, Garamond, serif",
  script: "'Pinyon Script', 'Snell Roundhand', cursive",
  sans: "Jost, Futura, 'Helvetica Neue', sans-serif",
} as const;

/** RGB normalisé 0–1, pour les uniformes de shaders */
export function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
