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
 * Polices des e-mails, comme sur le site. `display` : titres en Fraunces (grands titres de 28 px et
 * plus en Fraunces 120pt Light, droite, 300 ; petits titres en Fraunces 72pt Italic, 400), servie par
 * le site, repli sur Georgia. `text` : textes, boutons et étiquettes en Avenir Next Regular (choix de
 * la créatrice du 23/11), installée sur iPhone, iPad et Mac ; ailleurs, aucune police téléchargée
 * (les messageries les ignorent souvent) : Helvetica Neue, Helvetica, puis Arial.
 */
export const fontStacks = {
  display: "'Fraunces', Georgia, serif",
  text: "'Avenir Next', Avenir, 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;
