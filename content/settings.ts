/**
 * Réglages boutique (démonstration). En production, la livraison et les taxes sont
 * calculées par Shopify ; ces valeurs servent à l'affichage, au panier de démo,
 * à l'assistant et aux agents. Montants en centimes.
 */
export const shop = {
  currency: "EUR",
  freeShippingThreshold: 25000,
  giftWrapPrice: 1000,
  returnDays: 14,
  dispatchDays: "2 à 5 jours ouvrés",
  shippingRates: [
    { id: "fr-colissimo", zone: "FR", label: "Colissimo suivi en France", price: 900, delay: "2 à 3 jours ouvrés après expédition", freeAboveThreshold: true },
    { id: "fr-relay", zone: "FR", label: "Point relais Mondial Relay en France", price: 600, delay: "3 à 5 jours ouvrés après expédition", freeAboveThreshold: true, relay: true },
    { id: "fr-express", zone: "FR", label: "Chronopost express en France", price: 1800, delay: "24 h après expédition", freeAboveThreshold: false },
    { id: "fr-atelier", zone: "FR", label: "Retrait à l’atelier, Paris (sur rendez-vous)", price: 0, delay: "dès que la pièce est prête", freeAboveThreshold: false, pickup: true },
    { id: "eu-relay", zone: "EU", label: "Point relais Mondial Relay en Europe", price: 1200, delay: "4 à 7 jours ouvrés après expédition", freeAboveThreshold: true, relay: true, countries: ["BE", "LU", "ES", "NL", "DE", "IT"] },
    { id: "eu-dhl", zone: "EU", label: "DHL Express dans l’Union européenne", price: 2500, delay: "2 à 4 jours ouvrés après expédition", freeAboveThreshold: true },
    { id: "world-dhl", zone: "WORLD", label: "DHL Express à l’international", price: 4500, delay: "3 à 7 jours ouvrés après expédition, droits et taxes payés à la commande", freeAboveThreshold: false },
  ] as { id: string; zone: "FR" | "EU" | "WORLD"; label: string; price: number; delay: string; freeAboveThreshold: boolean; relay?: boolean; pickup?: boolean; countries?: string[] }[],
  /**
   * Livraisons hors Union européenne : la pièce part hors TVA française, et les droits de douane et
   * la TVA du pays d'arrivée sont calculés et payés à la commande (rien à régler à la livraison).
   * Taux INDICATIFS pour des vêtements fabriqués en France (accords de l'Union européenne), à faire
   * confirmer ; en production, Shopify les calcule (Marchés, droits et taxes : ACTIVATION.md).
   */
  importRates: {
    GB: { duty: 0, vat: 0.2, vatLabel: "TVA britannique" },
    CH: { duty: 0, vat: 0.081, vatLabel: "TVA suisse" },
    US: { duty: 0.15, vat: 0, vatLabel: "taxes de vente" },
    CA: { duty: 0, vat: 0.05, vatLabel: "TPS canadienne" },
    JP: { duty: 0, vat: 0.1, vatLabel: "taxe de consommation japonaise" },
  } as Record<string, { duty: number; vat: number; vatLabel: string }>,
  /** TVA française, incluse dans les prix affichés */
  vatRate: 0.2,
  /** délai minimal avant une date de livraison souhaitée (jours), pour une pièce disponible */
  giftDateMinDays: 7,
  countries: [
    { code: "FR", name: "France", zone: "FR" },
    { code: "BE", name: "Belgique", zone: "EU" },
    { code: "LU", name: "Luxembourg", zone: "EU" },
    { code: "DE", name: "Allemagne", zone: "EU" },
    { code: "IT", name: "Italie", zone: "EU" },
    { code: "ES", name: "Espagne", zone: "EU" },
    { code: "NL", name: "Pays-Bas", zone: "EU" },
    { code: "CH", name: "Suisse", zone: "WORLD" },
    { code: "GB", name: "Royaume-Uni", zone: "WORLD" },
    { code: "US", name: "États-Unis", zone: "WORLD" },
    { code: "CA", name: "Canada", zone: "WORLD" },
    { code: "JP", name: "Japon", zone: "WORLD" },
  ],
  paymentMethods: ["Carte bancaire", "Shop Pay", "Apple Pay", "Google Pay", "PayPal", "Paiement en 3 ou 4 fois"],
  /** Codes de démonstration (en production : réductions et cartes cadeaux Shopify) */
  demoDiscounts: [
    { code: "BIENVENUE", type: "percent" as const, value: 10, label: "Bienvenue, 10 %" },
    { code: "ATELIER", type: "fixed" as const, value: 3000, label: "Atelier, 30 €" },
  ],
  demoGiftCards: [{ code: "CADEAU-AWREA-100", balance: 10000 }],
  /**
   * Guide des tailles (page /guide-des-tailles, fiche de chaque pièce, « Trouver ma taille »,
   * assistante). Mesures du corps en centimètres : des repères courants, PAS encore fournis par la
   * Maison. Tant que `confirme` vaut false, la page affiche « à confirmer par la Maison » ; passer
   * à true une fois le tableau validé par la créatrice (ACTIVATION.md).
   */
  sizeGuide: {
    confirme: false,
    headers: ["Taille", "FR", "Tour de poitrine", "Tour de taille", "Tour de hanches"],
    rows: [
      ["XS", "34", "80 cm", "62 cm", "88 cm"],
      ["S", "36", "84 cm", "66 cm", "92 cm"],
      ["M", "38", "88 cm", "70 cm", "96 cm"],
      ["L", "40", "92 cm", "74 cm", "100 cm"],
      ["XL", "42", "96 cm", "78 cm", "104 cm"],
    ],
    note: "Mesures du corps, en centimètres. Votre pièce est confectionnée dans la taille choisie ; entre deux tailles, « Trouver ma taille » vous conseille selon la coupe de la pièce, et la créatrice vous répond sur rendez-vous.",
  },
} as const;

/**
 * Segments de la base clientes (tableau de bord, lettres ciblées, Cercle Awrea).
 * Une cliente est VIP au-delà de l'un des deux seuils ; fidèle à partir de deux commandes ;
 * nouvelle sinon. Montants en centimes.
 */
export const segments = {
  vipMinSpent: 150000,
  vipMinOrders: 3,
  loyalMinOrders: 2,
} as const;

