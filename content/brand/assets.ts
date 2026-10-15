/**
 * LOGO OFFICIEL (ressources-awrea/LOGO, préparé par scripts/ressources.py).
 * Fichiers PNG à fond transparent tirés des fichiers de la Maison (déliés intacts), affichés en
 * masque CSS : ils prennent la couleur du texte (noir sur fond clair, blanc cassé en mode Nuit).
 * Le jour où la Maison fournit des SVG, les déposer dans public/brand/ et changer `src` ici.
 */
export const brandAssets = {
  /** Logo complet : « AWREA » et « PARIS » espacé dessous (LOGO ENTIER). */
  logo: { src: "/brand/awrea-logo.png" as string | null, width: 708, height: 293 },
  /** Monogramme : « AW » et « PARIS » dessous (LOGO MINI). */
  monogram: { src: "/brand/awrea-monogramme.png" as string | null, width: 380, height: 325 },
  /** Monogramme « AW » seul, pour les petites tailles (icônes, cachet de l'enveloppe). */
  wordmark: { src: "/brand/awrea-aw.png" as string | null, width: 380, height: 212 },
};
