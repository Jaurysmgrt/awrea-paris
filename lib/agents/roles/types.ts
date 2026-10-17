/**
 * Rôles de gestion quotidienne : chaque rôle surveille une partie de la Maison, agit seul sur le
 * quotidien et propose à la créatrice ce qui touche à l'argent ou ne se défait pas. Chaque passage
 * est relu par un critique indépendant (« Contrôle ») avant d'arriver dans l'Atelier.
 */
export type RoleId =
  | "gardien-editeur"
  | "avis"
  | "retours"
  | "logistique"
  | "anti-fraude"
  | "comptabilite"
  | "rgpd"
  | "cercle"
  | "drops"
  | "sur-mesure"
  | "rendez-vous"
  | "production"
  | "presse"
  | "instagram"
  | "publicite"
  | "accessibilite"
  | "performance"
  | "sauvegarde";

/** jour : 0 dimanche … 6 samedi (heure de Paris) ; mensuel : jour du mois */
export type Cadence = { kind: "quotidien" } | { kind: "hebdomadaire"; jour: number } | { kind: "mensuel"; jour: number };

export interface Finding {
  gravite: "info" | "attention" | "urgent";
  titre: string;
  detail?: string;
  /** page de l'Atelier où agir (« /retours »), jamais une adresse extérieure */
  lien?: string;
  /** objet concerné (numéro de commande, document…) pour éviter les doublons d'un jour à l'autre */
  cible?: string;
}

export interface RoleOutcome {
  resume: string;
  findings: Finding[];
}

export interface RoleReport extends RoleOutcome {
  role: RoleId;
  at: string;
  mode: "claude" | "demo";
  trigger: "cron" | "manuel" | "evenement";
  actions: { done: number; proposed: number; failed: number };
  /** observations du critique indépendant sur ce passage */
  controle: Finding[];
  erreurs: string[];
}
