/**
 * Paiement d'une commande de la boutique de la Maison. Stripe encaisse ; la boutique ne garde que
 * l'état du paiement, ses références Stripe et son historique, jamais un numéro de carte ni aucune
 * donnée bancaire (seulement le moyen employé, « Carte Visa », « PayPal »…).
 *
 * Module pur, partagé par le site, l'Atelier et les tests.
 */

export type StatutPaiement = "en-attente" | "reussi" | "echoue" | "expire" | "rembourse" | "partiellement-rembourse" | "conteste";

export const LIBELLE_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  "en-attente": "En attente",
  reussi: "Réussi",
  echoue: "Échoué",
  expire: "Expiré",
  rembourse: "Remboursé",
  "partiellement-rembourse": "Remboursé en partie",
  conteste: "Contesté",
};

/** Un événement du paiement, tel que l'Atelier le montre (jamais de donnée bancaire). */
export interface EvenementPaiement {
  at: string;
  /** type Stripe (« checkout.session.completed ») ou geste de l'Atelier (« atelier.remboursement ») */
  type: string;
  resume: string;
  /** identifiant Stripe de l'objet concerné (cs_, pi_, ch_, re_, dp_) */
  reference?: string;
  /** centimes */
  montant?: number;
}

export interface Paiement {
  /** « essai » : paiement simulé de la démonstration, aucun argent ne bouge */
  prestataire: "stripe" | "essai";
  statut: StatutPaiement;
  /** centimes, ce que la cliente règle */
  montant: number;
  /** centimes déjà remboursés */
  rembourse: number;
  devise: "eur";
  /** session Stripe Checkout (cs_…) et son adresse, valable jusqu'à son expiration */
  session?: string;
  url?: string;
  expireLe?: string;
  /** PaymentIntent (pi_…) et charge (ch_…, py_…) */
  intention?: string;
  charge?: string;
  /** moyen employé, en clair (« Carte Visa », « PayPal », « Apple Pay ») */
  moyen?: string;
  /** paiement passé en mode test de Stripe */
  test?: boolean;
  /** empreinte du panier et de l'adresse : une même commande ne s'enregistre qu'une fois */
  empreinte?: string;
  evenements: EvenementPaiement[];
}

/** Lien vers le paiement dans le tableau de bord Stripe (mode test compris). */
export function lienStripe(p: Pick<Paiement, "intention" | "session" | "test">): string | null {
  const base = `https://dashboard.stripe.com/${p.test ? "test/" : ""}`;
  if (p.intention) return `${base}payments/${encodeURIComponent(p.intention)}`;
  if (p.session) return `${base}checkout/sessions/${encodeURIComponent(p.session)}`;
  return null;
}

/** Un paiement nouveau, en attente. */
export function paiementEnAttente(prestataire: Paiement["prestataire"], montant: number, test = false): Paiement {
  return { prestataire, statut: "en-attente", montant, rembourse: 0, devise: "eur", ...(test ? { test: true } : {}), evenements: [] };
}

/** Ajoute un événement (les 60 plus récents sont gardés, du plus ancien au plus récent). */
export function avecEvenement(p: Paiement, e: EvenementPaiement): Paiement {
  return { ...p, evenements: [...p.evenements, e].slice(-60) };
}
