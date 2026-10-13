/** Modèle commerce commun aux pilotes `demo` et `shopify`. Montants en centimes d'euro. */

export type Size = "XS" | "S" | "M" | "L" | "XL" | "TU";
export type Category = "robe" | "body" | "top" | "jupe" | "accessoire";
export type Availability = "available" | "low" | "preorder" | "soldout";

export interface Image {
  src: string; // chemin sans extension de taille, ex. /media/img/odessa-1
  alt: string;
  width: number;
  height: number;
}

export interface Video {
  src: string;
  poster: string;
  alt: string;
}

export interface Variant {
  id: string;
  sku: string;
  size: Size;
  quantity: number; // stock disponible pour cette taille
  preorder: boolean; // fabrication à la commande possible quand quantity = 0
}

export interface Material {
  name: string;
  percent: number;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  tagline: string;
  category: Category;
  collection: string; // handle de collection
  price: number;
  compareAtPrice?: number;
  edition: {
    total: number; // taille de la série (1 = pièce unique)
    produced: number; // pièces déjà numérotées / vendues
  };
  leadTimeWeeks?: number; // délai de fabrication en précommande
  variants: Variant[];
  images: Image[];
  detailImage: Image; // pour la loupe dentelle
  video?: Video;
  description: string[];
  materials: Material[];
  lining?: string;
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
  preorder: boolean;
  leadTimeWeeks?: number;
  editionLabel?: string;
}

export interface GiftOptions {
  wrap: boolean;
  message: string;
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
  availability?: "available" | "preorder" | "all" | null;
  collection?: string | null;
}

export type OrderStatus = "pending" | "paid" | "in_production" | "shipped" | "delivered" | "returned" | "refunded" | "blocked";

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  email: string;
  name: string;
  status: OrderStatus;
  lines: { title: string; size: Size; quantity: number; unitPrice: number; handle: string; editionLabel?: string }[];
  total: number;
  shipping: { method: string; price: number; country: string; tracking?: string; carrier?: string };
  gift?: GiftOptions;
  paymentMethod: string;
  /** canal d'origine (mesure d'audience acceptée) : instagram, google, newsletter, direct… */
  source?: string | null;
  /** preuve d'acceptation des CGV et choix de la cliente au moment de la commande */
  consents?: { cgvVersion: string; acceptedAt: string; newsletter: boolean };
}
