/** Modèle de la base clientes (commun aux pilotes Supabase et démonstration). Montants en centimes. */
import type { Size } from "@/lib/commerce/types";

export type Locale = "fr" | "en";
export type Currency = "EUR" | "GBP" | "USD" | "CHF";

export interface Measurements {
  /** tour de poitrine, de taille, de hanches et stature, en centimètres */
  poitrine?: number;
  taille?: number;
  hanches?: number;
  stature?: number;
}

export interface Sizes {
  haut?: Size;
  bas?: Size;
  robe?: Size;
  mesures?: Measurements;
}

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  /** AAAA-MM-JJ, facultatif */
  birthday: string | null;
  locale: Locale;
  currency: Currency;
  sizes: Sizes;
  marketingEmail: boolean;
  personalization: boolean;
  cercleMember: boolean;
  cercleJoinedAt: string | null;
  vipSince: string | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
}

/** Champs modifiables par la cliente elle-même */
export type ProfilePatch = Partial<Pick<CustomerProfile, "firstName" | "lastName" | "phone" | "birthday" | "locale" | "currency" | "sizes" | "marketingEmail" | "personalization" | "cercleMember">>;

export interface Address {
  id: string;
  label: string | null;
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  /** code pays ISO à deux lettres */
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export type BrowsingKind = "view" | "collection" | "search";
export interface BrowsingEvent {
  kind: BrowsingKind;
  handle?: string | null;
  collection?: string | null;
  at: string;
}

export type Segment = "nouvelle" | "fidele" | "vip";

export interface CustomerStats {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  cercleMember: boolean;
  marketingEmail: boolean;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  segment: Segment;
}

/** Session cliente (connexion e-mail, Google ou Apple) */
export interface CustomerSession {
  id: string;
  email: string;
}
