/**
 * EMPLACEMENTS DU LOGO OFFICIEL
 * Déposez les fichiers SVG (monochromes) dans public/brand/ puis renseignez les chemins ci-dessous.
 * Les logos sont affichés en masque CSS : ils prennent automatiquement la couleur du texte
 * (blanc cassé sur fond noir, noir sur fond clair).
 * Tant que `src` vaut null, le logo provisoire vectorisé est affiché (content/brand/logo-paths.ts,
 * fichiers noir et blanc dans public/brand pour la presse et les réseaux).
 */
export const brandAssets = {
  /** Logo complet : monogramme AW + « PARIS » espacé dessous. Ratio conseillé 1:1 à 4:3. */
  logo: { src: null as string | null, width: 120, height: 96 },
  /** Monogramme seul (favicon, en-tête compact, cachet de l'enveloppe). */
  monogram: { src: null as string | null, width: 64, height: 64 },
  /** Logotype horizontal facultatif pour le pied de page et les e-mails. */
  wordmark: { src: null as string | null, width: 320, height: 48 },
};
