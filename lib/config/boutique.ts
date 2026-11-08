/**
 * La boutique d'Awrea Paris est entièrement à la Maison : pièces, commandes, clientes et stocks
 * vivent dans sa propre base, gérés depuis l'Atelier, sans plateforme de commerce extérieure.
 *
 * Deux façons de tourner :
 * - boutique réelle (site de production sur Vercel, ou BOUTIQUE_REELLE=1) : jamais d'exemple de
 *   commande, de cliente ni d'accès d'essai ; tant que le paiement en ligne n'est pas branché, le
 *   site ne prend aucune commande payée et le dit ;
 * - démonstration (développement, prévisualisations, tests) : des commandes d'exemple et un
 *   paiement d'essai, clairement signalés, pour tout essayer sans argent réel.
 *
 * Le paiement en ligne passera par Stripe Checkout (choix de la créatrice du 08/11) : la carte est
 * saisie chez Stripe, jamais sur le site.
 */
export const boutiqueReelle = () => process.env.VERCEL_ENV === "production" || process.env.BOUTIQUE_REELLE === "1";

/** Paiement en ligne réel branché (Stripe, à venir) : d'ici là, aucune commande payée sur la boutique réelle. */
export const paiementEnLigne = () => false;

/** Le site peut-il prendre une commande ? Paiement d'essai en démonstration, paiement réel sinon. */
export const commandesOuvertes = () => !boutiqueReelle() || paiementEnLigne();
