/**
 * EMPLACEMENTS DU LOGO OFFICIEL
 * Déposez les fichiers SVG (monochromes) dans public/brand/ puis renseignez les chemins ci-dessous.
 * Les logos sont affichés en masque CSS : ils prennent automatiquement la couleur du texte
 * (ivoire sur fond noir, noir sur fond ivoire, or au survol).
 * Tant que `src` vaut null, un logo typographique provisoire est affiché.
 */
export const brandAssets = {
  /** Logo complet : monogramme AW + « PARIS » espacé dessous. Ratio conseillé 1:1 à 4:3. */
  logo: { src: null as string | null, width: 120, height: 96 },
  /** Monogramme seul (favicon, en-tête compact, cachet de l'enveloppe). */
  monogram: { src: null as string | null, width: 64, height: 64 },
  /** Logotype horizontal facultatif pour le pied de page et les e-mails. */
  wordmark: { src: null as string | null, width: 320, height: 48 },
};
