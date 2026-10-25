/**
 * Modèle commerce commun aux pilotes `demo` et `shopify`. Montants en centimes d'euro.
 *
 * Modèle de la Maison : chaque pièce est créée SUR DEMANDE, sans stock, par des artisans français.
 * Il n'y a donc ni quantité en stock, ni rupture, ni série numérotée : toutes les tailles se
 * commandent toujours, et chaque pièce annonce son délai de fabrication.
 */

export type Size = "XS" | "S" | "M" | "L" | "XL" | "TU";
export type Category = "robe" | "body" | "top" | "jupe" | "accessoire";

export interface Image {
  src: string; // chemin sans extension de taille, ex. /media/img/odessa-1
  alt: string;
  width: number;
  height: number;
  /** point focal réglé dans l'éditeur (pourcentages) : guide chaque recadrage */
  focal?: { x: number; y: number };
  /**
   * Visuel provisoire (image générée en attendant les photographies de la Maison) : accompagné
   * d'une mention discrète « visuel provisoire », repéré dans l'éditeur pour être remplacé.
   */
  provisoire?: boolean;
}

export interface Video {
  src: string;
  poster: string;
  alt: string;
}

/** Une taille de la pièce. Toutes se commandent : la pièce est confectionnée à cette taille. */
export interface Variant {
  id: string;
  sku: string;
  size: Size;
}

/** Délai de fabrication d'une pièce créée sur demande, en semaines (de… à…). */
export interface LeadTime {
  min: number;
  max: number;
}

export interface Material {
  name: string;
  percent: number;
}

/** Fiche de traçabilité : qui a fait quoi, où, en combien de temps, et d'où viennent les matières. */
export interface Trace {
  /** étapes de fabrication, dans l'ordre */
  steps: { label: string; place: string; hours?: number }[];
  /** origine de chaque matière (null : à préciser par l'atelier) */
  origins: { material: string; origin: string | null }[];
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  tagline: string;
  category: Category;
  collection: string; // handle de collection
  price: number;
  /**
   * les tailles n'ont pas toutes le même prix (boutique Shopify) : `price` est le plus bas, et
   * l'Atelier ne remplace pas ces prix par un prix unique
   */
  priceVaries?: boolean;
  /** prix provisoire, à confirmer par la Maison (signalé dans l'Atelier et dans ACTIVATION.md) */
  priceProvisional?: boolean;
  /** délai de fabrication : la pièce est créée après la commande */
  leadTime: LeadTime;
  /** délai provisoire, à confirmer par la Maison */
  leadTimeProvisional?: boolean;
  /** pastille « Nouveau » sur la carte de la pièce */
  isNew?: boolean;
  variants: Variant[];
  images: Image[];
  /** photographie de détail (loupe dentelle), quand il y en a une */
  detailImage?: Image;
  video?: Video;
  description: string[];
  materials: Material[];
  lining?: string;
  trace?: Trace;
  care: string[];
  fit: string;
  model: string;
  details: string[];
  completeTheLook: string[]; // handles
  seo: { title: string; description: string };
  tags: string[];
  publishedAt: string;
  /** couleur principale (flux produits) ; à défaut, déduite des textes */
  color?: string;
}

export interface Collection {
  handle: string;
  title: string;
  season: string;
  intention: string[];
  lead: string;
  cover: Image;
  moodboard: { image: Image; caption: string; span?: "tall" | "wide" | "square" }[];
  products: string[]; // handles
  current: boolean;
  /** textes de la créatrice (accroche, intention) repris mot pour mot : jamais réécrits */
  officiel?: boolean;
  seo: { title: string; description: string };
}

export interface LookHotspot {
  product: string; // handle
  x: number; // % depuis la gauche
  y: number; // % depuis le haut
}

export interface Look {
  handle: string;
  title: string;
  note: string;
  image: Image;
  hotspots: LookHotspot[];
}

export interface CartLine {
  id: string;
  variantId: string;
  productHandle: string;
  title: string;
  size: Size;
  quantity: number;
  unitPrice: number;
  image: Image;
  /** délai de fabrication de la pièce, annoncé dans le panier et au paiement */
  leadTime: LeadTime;
}

export interface GiftOptions {
  wrap: boolean;
  message: string;
  /** prix masqués sur le bon de livraison (pièce offerte) */
  hidePrices?: boolean;
  /** date de livraison souhaitée, AAAA-MM-JJ */
  deliveryDate?: string | null;
}

export interface Address {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
}

/** Taxes de la commande : TVA française incluse, ou export (hors TVA française, droits et TVA du pays payés à la commande). */
export interface OrderTaxes {
  vatRate: number;
  vat: number;
  /** droits et taxes à l'importation (commande Shopify) */
  duties?: number;
  export?: { exVat: number; duty: number; dutyRate: number; importVat: number; importVatRate: number };
}

export interface Cart {
  id: string;
  lines: CartLine[];
  subtotal: number;
  discount: { code: string; amount: number; label: string } | null;
  giftCard: { code: string; amount: number } | null;
  gift: GiftOptions;
  giftWrapPrice: number;
  shippingEstimate: number | null; // null = calculée à l'étape suivante
  freeShippingThreshold: number;
  total: number;
  totalQuantity: number;
  checkoutUrl: string;
  mode: "demo" | "shopify";
}

export interface ProductFilter {
  category?: Category | null;
  size?: Size | null;
  collection?: string | null;
}

/**
 * Étapes d'une commande : reçue (`paid`), en confection (`in_production`), prête (`ready`),
 * expédiée (`shipped`), livrée (`delivered`) ; plus les cas particuliers (paiement en attente,
 * retour, remboursement, commande bloquée).
 */
export type OrderStatus = "pending" | "paid" | "in_production" | "ready" | "shipped" | "delivered" | "returned" | "refunded" | "blocked";

/**
 * Les cinq étapes de la frise d'une commande, dans l'ordre : « Commande reçue », « En confection »,
 * « Prête », « Expédiée », « Livrée » (libellés : document de contenu « suivi-commande »).
 */
export type OrderStage = "paid" | "in_production" | "ready" | "shipped" | "delivered";

/** Date (ISO) de chaque étape franchie par une commande. */
export type OrderStageDates = Partial<Record<OrderStage, string>>;

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  email: string;
  name: string;
  status: OrderStatus;
  /** date de livraison, quand elle est connue (point de départ du délai de retour) */
  deliveredAt?: string;
  /** date de chaque étape franchie (reçue, en confection, prête, expédiée, livrée) */
  stages?: OrderStageDates;
  /**
   * délai de fabrication annoncé à la commande (le plus long de ses pièces) : la date estimée de fin
   * de confection en découle, même si la Maison change ensuite le délai d'une pièce
   */
  leadTime?: LeadTime;
  lines: {
    title: string;
    size: Size;
    quantity: number;
    unitPrice: number;
    handle: string;
    /**
     * @deprecated ancien numéro d'édition (« N° 3 / 5 »), présent seulement sur les commandes passées
     * avant le modèle « sur demande ». Le numéro de création unique est porté par le certificat.
     */
    editionLabel?: string;
  }[];
  total: number;
  shipping: {
    method: string;
    price: number;
    country: string;
    tracking?: string;
    carrier?: string;
    /** point relais choisi */
    relay?: { id: string; name: string; address: string };
    /** retrait à l'atelier sur rendez-vous */
    pickup?: boolean;
  };
  /** adresse de livraison et de facturation */
  address?: Address;
  /** remise appliquée (code avantage) */
  discount?: { code: string; label: string; amount: number };
  /** part payée par carte cadeau */
  giftCard?: { code: string; amount: number };
  taxes?: OrderTaxes;
  gift?: GiftOptions;
  paymentMethod: string;
  /** canal d'origine (mesure d'audience acceptée) : instagram, google, newsletter, direct… */
  source?: string | null;
  /** preuve d'acceptation des CGV et choix de la cliente au moment de la commande */
  consents?: { cgvVersion: string; acceptedAt: string; newsletter: boolean };
}
