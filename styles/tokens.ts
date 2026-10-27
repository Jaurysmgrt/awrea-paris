/**
 * Miroir TypeScript des couleurs de styles/tokens.css, pour les contextes sans CSS :
 * métadonnées, e-mails, images Open Graph, factures.
 * `npm run audit:tokens` vérifie que ces valeurs restent identiques au CSS.
 */
export const palette = {
  ink: "#0a0a0a", // noir
  ivory: "#f7f6f3", // blanc cassé
  pearl: "#e4e2dd", // gris pierre
  taupe: "#8c8780", // gris taupe (grands textes, fonds noirs)
  taupeDeep: "#66635e", // taupe des petits textes sur fond clair (contraste AA)
} as const;

/**
 * Les deux polices officielles, pas une de plus (e-mails : repli sur Georgia, puis serif).
 * `display` : titres en Fraunces 72pt Italic (toujours en italique) ; `text` : textes, boutons et
 * étiquettes en Cormorant Garamond.
 */
export const fontStacks = {
  display: "'Fraunces', Georgia, serif",
  text: "'Cormorant Garamond', Georgia, serif",
} as const;
