/**
 * La boutique d'Awrea Paris est entièrement à la Maison : pièces, commandes, clientes et stocks
 * vivent dans sa propre base, gérés depuis l'Atelier, sans plateforme de commerce extérieure.
 *
 * Deux façons de tourner :
 * - boutique réelle (tout site déployé sur Vercel, production comme prévisualisation, ou
 *   BOUTIQUE_REELLE=1) : jamais d'exemple de commande, de code d'essai, d'accès d'essai ni de remise
 *   à zéro ; tant que le paiement en ligne n'est pas branché, le site ne prend aucune commande payée
 *   et le dit ;
 * - démonstration (développement local, tests, ou prévisualisation Vercel marquée
 *   BOUTIQUE_DEMONSTRATION=1, avec ses propres stockage et clés Stripe de test) : des commandes
 *   d'exemple et un paiement d'essai, clairement signalés, pour tout essayer sans argent réel.
 *   La production Vercel n'est jamais en démonstration, quel que soit le réglage.
 *
 * Le paiement en ligne passe par Stripe Checkout (choix de la créatrice du 08/11) : la carte est
 * saisie chez Stripe, jamais sur le site. Clés dans les variables d'environnement seulement
 * (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET). Sur la boutique réelle, seule une clé réelle
 * (sk_live_, rk_live_) ouvre le paiement : une clé de test n'y prend jamais de commande.
 */
import { providerOf } from "@/lib/config/providers";

export function boutiqueReelle(): boolean {
  if (process.env.VERCEL_ENV === "production" || process.env.BOUTIQUE_REELLE === "1") return true;
  // prévisualisation Vercel : réelle par défaut (elle peut partager les données de la production)
  if (process.env.VERCEL_ENV) return process.env.BOUTIQUE_DEMONSTRATION !== "1";
  return false;
}

const cleStripe = () => process.env.STRIPE_SECRET_KEY?.trim() ?? "";

/** Stripe est configuré (clé secrète et secret du webhook présents, interrupteur PAYMENT_PROVIDER). */
export const stripeConfigure = () => providerOf("paiement") === "stripe";

/** Clé Stripe de test : paiements du mode test de Stripe, cartes de test, aucun argent réel. */
export const stripeEnTest = () => /^(sk|rk)_test_/.test(cleStripe());

/** Paiement en ligne réel branché : Stripe configuré, avec une clé réelle sur la boutique réelle. */
export const paiementEnLigne = () => stripeConfigure() && (!boutiqueReelle() || /^(sk|rk)_live_/.test(cleStripe()));

/** Pourquoi le paiement Stripe n'est pas ouvert (Réglages de l'Atelier), ou null s'il l'est. */
export function raisonPaiementFerme(): string | null {
  if (paiementEnLigne()) return null;
  if (!stripeConfigure()) return boutiqueReelle() ? "Stripe n’est pas encore branché : la boutique ne prend aucune commande payée." : "Stripe n’est pas branché : la démonstration utilise le paiement d’essai.";
  return "La clé Stripe est une clé de test : la boutique réelle n’accepte qu’une clé réelle (sk_live_).";
}

/** Le site peut-il prendre une commande ? Paiement d'essai en démonstration, paiement réel sinon. */
export const commandesOuvertes = () => !boutiqueReelle() || paiementEnLigne();
