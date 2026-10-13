/**
 * Inventaire des cookies et traceurs — source unique pour le bandeau, le gestionnaire
 * de consentement et la page « Politique cookies ». À tenir à jour à chaque nouvel outil.
 */
import type { ConsentCategory } from "@/lib/consent";

export interface CookieCategoryInfo {
  key: ConsentCategory;
  label: string;
  /** une phrase, affichée dans le gestionnaire */
  summary: string;
  always?: boolean;
}

export const cookieCategories: CookieCategoryInfo[] = [
  {
    key: "necessary",
    label: "Nécessaires",
    summary: "Panier, connexion à votre compte, sécurité et mémorisation de vos choix. Toujours actifs : le site ne peut fonctionner sans eux.",
    always: true,
  },
  {
    key: "analytics",
    label: "Mesure d’audience",
    summary: "Compter les visites et les pièces consultées, de façon agrégée, pour améliorer le site.",
  },
  {
    key: "personalization",
    label: "Personnalisation",
    summary: "Se souvenir des pièces que vous avez regardées pour vous proposer une sélection, un accueil et des rappels qui vous ressemblent.",
  },
  {
    key: "advertising",
    label: "Publicité",
    summary: "Mesurer l’efficacité de nos campagnes sur Instagram, Facebook et Google, et vous y montrer nos pièces.",
  },
];

export interface CookieEntry {
  name: string;
  provider: string;
  category: ConsentCategory;
  purpose: string;
  duration: string;
  /** cookie (navigateur) ou stockage local */
  kind: "cookie" | "stockage local" | "stockage de session";
  /** préfixe à effacer lors d'un retrait de consentement (traceurs tiers) */
  clearPrefix?: string;
}

export const cookieInventory: CookieEntry[] = [
  { name: "awrea_consent", provider: "Awrea Paris", category: "necessary", purpose: "Mémoriser vos choix en matière de cookies.", duration: "13 mois", kind: "cookie" },
  { name: "awrea_cart", provider: "Awrea Paris", category: "necessary", purpose: "Conserver le contenu de votre panier.", duration: "30 jours", kind: "cookie" },
  { name: "awrea_session", provider: "Awrea Paris", category: "necessary", purpose: "Vous garder connectée à votre compte.", duration: "30 jours", kind: "cookie" },
  { name: "sb-…-auth-token", provider: "Awrea Paris (Supabase)", category: "necessary", purpose: "Session sécurisée de votre compte cliente.", duration: "Durée de la session, 1 an au plus", kind: "cookie" },
  { name: "awrea_admin", provider: "Awrea Paris", category: "necessary", purpose: "Session de l’équipe de l’atelier (espace de gestion uniquement).", duration: "12 heures", kind: "cookie" },
  { name: "awrea_wishlist", provider: "Awrea Paris", category: "necessary", purpose: "Conserver les pièces que vous avez gardées.", duration: "Jusqu’à suppression", kind: "stockage local" },
  { name: "awrea_assistant", provider: "Awrea Paris", category: "necessary", purpose: "Conserver la conversation avec l’assistante pendant votre visite.", duration: "Fin de la visite", kind: "stockage de session" },
  { name: "awrea_prefs", provider: "Awrea Paris", category: "necessary", purpose: "Retenir la langue, la devise et vos préférences d’affichage (jour, nuit ou automatique ; son ; animations).", duration: "13 mois", kind: "stockage local" },
  { name: "awrea_view_…", provider: "Awrea Paris", category: "analytics", purpose: "Ne compter qu’une fois la consultation d’une pièce pendant une visite.", duration: "Fin de la visite", kind: "stockage de session" },
  { name: "Plausible", provider: "Plausible Analytics (UE)", category: "analytics", purpose: "Mesure d’audience agrégée, sans cookie ni donnée personnelle.", duration: "Aucun cookie", kind: "cookie" },
  { name: "_ga, _ga_…", provider: "Google Analytics 4", category: "analytics", purpose: "Mesure d’audience (seulement si Google Analytics est utilisé à la place de Plausible).", duration: "13 mois", kind: "cookie", clearPrefix: "_ga" },
  { name: "awrea_seen", provider: "Awrea Paris", category: "personalization", purpose: "Pièces et collections consultées, pour personnaliser l’accueil et les recommandations.", duration: "13 mois", kind: "stockage local" },
  { name: "_fbp, _fbc", provider: "Meta (Instagram, Facebook)", category: "advertising", purpose: "Mesurer les visites issues de nos publicités et vous montrer nos pièces sur Instagram et Facebook.", duration: "3 mois", kind: "cookie", clearPrefix: "_fb" },
  { name: "_gcl_au", provider: "Google Ads", category: "advertising", purpose: "Mesurer les achats issus de nos annonces Google.", duration: "3 mois", kind: "cookie", clearPrefix: "_gcl" },
];
