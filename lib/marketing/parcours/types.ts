/**
 * Parcours de vente (cahier de l'Atelier du 10/11, § 4 et 5) : un parcours accompagne une personne
 * depuis un évènement (inscription, intérêt, panier, commande) par des étapes dans l'ordre (un
 * e-mail de la lettre, un délai, une condition), jusqu'à sa sortie (désinscription, objectif
 * atteint, conditions plus remplies, fin des étapes).
 *
 * Module pur : types, libellés de l'Atelier et validation, partagés par le moteur
 * (lib/marketing/parcours/moteur.ts), le serveur et l'éditeur. Aucune lecture ni écriture ici.
 */
import { z } from "zod";

export type Statut = "brouillon" | "actif" | "pause";
export type DeclencheurId = "inscription" | "interet" | "panier" | "premiere-commande" | "commande";
export type CritereId = "sans-commande" | "avec-commande" | "fidele" | "vip" | "cercle" | "compte" | "sans-compte" | "panier";
export type ExclusionId = "autre-parcours" | "commande-recente";
export type Objectif = "achat" | "aucun";
export type Unite = "heures" | "jours";
/** simulation : rien ne part ; réel : les e-mails partent (lib/marketing/parcours/index.ts) */
export type Mode = "simulation" | "reel";

export type Etape =
  | { id: string; type: "email"; email: string }
  | { id: string; type: "attente"; duree: number; unite: Unite }
  | { id: string; type: "condition"; critere: CritereId };

export interface Parcours {
  id: string;
  nom: string;
  /** modèle d'origine, s'il y en a un */
  modele?: string;
  statut: Statut;
  declencheur: DeclencheurId;
  /** qui entre : les personnes dont l'évènement date de moins de tant de jours */
  fenetreJours: number;
  /** conditions d'entrée (toutes remplies) */
  entree: CritereId[];
  etapes: Etape[];
  /** sortie quand l'objectif est atteint (un achat après l'entrée) */
  objectif: Objectif;
  /** sortie dès que les conditions d'entrée ne sont plus remplies */
  sortieSiConditions: boolean;
  exclusions: ExclusionId[];
  creeLe: string;
  creePar: string;
  modifieLe: string;
  modifiePar: string;
  /** dernière mise en route */
  activeLe?: string;
}

export interface Reglages {
  /** un e-mail marketing au plus tous les tant de jours, par personne, tous parcours confondus */
  plafondJours: number;
}
export const REGLAGES_PAR_DEFAUT: Reglages = { plafondJours: 3 };
export const PLAFOND_MIN = 1;
export const PLAFOND_MAX = 30;

/** Interrupteur des envois réels, dans l'Atelier (la seconde clé est PARCOURS_ENVOIS_REELS=1 dans Vercel). */
export interface Interrupteur {
  actif: boolean;
  par?: string;
  le?: string;
}

/**
 * Une personne, telle que le moteur la voit (lue par lib/marketing/parcours/contacts.ts). Les dates
 * sont au format ISO ; `commandes` : les dates des commandes payées, de la plus ancienne à la plus
 * récente.
 */
export interface Contact {
  email: string;
  prenom: string | null;
  /** peut recevoir un e-mail marketing : consentement donné et pas de désinscription depuis */
  marketing: boolean;
  /** date de l'inscription à la lettre (ou de l'accord donné dans son compte, quand elle est connue) */
  inscriteLe: string | null;
  compte: boolean;
  cercle: boolean;
  segment: "nouvelle" | "fidele" | "vip";
  commandes: string[];
  /** premier signe d'intérêt : inscription à une avant-première, rendez-vous de conseil */
  interetLe: string | null;
  /** dernière mise à jour d'un panier non finalisé (cliente connectée, personnalisation acceptée) */
  panierLe: string | null;
  /** dernier e-mail marketing parti hors des parcours (lettre, avant-première, relance du panier) */
  dernierMarketing: string | null;
}

/** Où en est une personne dans un parcours. */
export interface Suivi {
  email: string;
  entreeLe: string;
  /** indice de la prochaine étape */
  etape: number;
  /** la prochaine étape peut se faire à partir de ce moment */
  pretLe: string;
  envoyes: number;
  fin?: { le: string; raison: RaisonSortie };
}
export type RaisonSortie = "desinscription" | "objectif" | "conditions" | "condition" | "termine" | "retire";

/** Ce que la Maison sait de chaque personne, tous parcours confondus (plafond, jamais deux fois). */
export interface Personne {
  dernier?: string;
  recus: string[];
}

/** État d'un mode : les suivis par parcours, et les personnes. */
export interface Etat {
  suivis: Record<string, Record<string, Suivi>>;
  personnes: Record<string, Personne>;
}
export const etatVide = (): Etat => ({ suivis: {}, personnes: {} });

export type Evenement = "entree" | "email" | "sortie" | "erreur";
export interface LigneJournal {
  at: string;
  mode: Mode;
  parcours: string;
  parcoursNom: string;
  email: string;
  evenement: Evenement;
  /** e-mail de l'étape (document) et son objet */
  emailId?: string;
  sujet?: string;
  raison?: RaisonSortie;
  detail?: string;
}

// ------------------------------------------------------------------ libellés de l'Atelier
export const STATUTS: Record<Statut, string> = { brouillon: "Brouillon", actif: "Actif", pause: "En pause" };

export const DECLENCHEURS: Record<DeclencheurId, { label: string; aide: string }> = {
  inscription: { label: "Inscription à la lettre", aide: "Le jour où elle s’inscrit." },
  interet: { label: "Intérêt pour la Maison", aide: "Inscrite à une avant-première, ou rendez-vous de conseil pris." },
  panier: { label: "Panier non finalisé", aide: "Cliente connectée qui a accepté la personnalisation. Les paniers sans compte restent dans le navigateur : la Maison ne les voit pas." },
  "premiere-commande": { label: "Première commande", aide: "Le jour de sa première commande payée." },
  commande: { label: "Dernière commande", aide: "Le jour de sa dernière commande payée." },
};

export const CRITERES: Record<CritereId, string> = {
  "sans-commande": "N’a jamais commandé",
  "avec-commande": "A déjà commandé",
  fidele: "Cliente fidèle",
  vip: "Cliente VIP",
  cercle: "Membre du Cercle",
  compte: "A un compte",
  "sans-compte": "N’a pas de compte",
  panier: "A un panier en cours",
};

export const EXCLUSIONS: Record<ExclusionId, string> = {
  "autre-parcours": "Déjà dans un autre parcours",
  "commande-recente": "A commandé ces 30 derniers jours",
};

export const RAISONS: Record<RaisonSortie, string> = {
  desinscription: "Désinscrite",
  objectif: "A acheté",
  conditions: "Ne remplit plus les conditions",
  condition: "Condition non remplie",
  termine: "Parcours terminé",
  retire: "Parcours retiré",
};

export const UNITES: Record<Unite, string> = { heures: "heures", jours: "jours" };

// ------------------------------------------------------------------ validation (enregistrement par l'Atelier)
const ID = z.string().regex(/^[a-z0-9-]{2,40}$/);
const DOC = z.string().regex(/^email-[a-z0-9-]{1,74}$/);
const Critere = z.enum(Object.keys(CRITERES) as [CritereId, ...CritereId[]]);

export const EtapeSchema = z.discriminatedUnion("type", [
  z.object({ id: ID, type: z.literal("email"), email: DOC }).strict(),
  z.object({ id: ID, type: z.literal("attente"), duree: z.number().int().min(1).max(365), unite: z.enum(["heures", "jours"]) }).strict(),
  z.object({ id: ID, type: z.literal("condition"), critere: Critere }).strict(),
]);

/** Ce que l'éditeur envoie : la définition, sans le statut ni les dates (gérés par le serveur). */
export const DefinitionSchema = z
  .object({
    nom: z.string().trim().min(2).max(80),
    declencheur: z.enum(Object.keys(DECLENCHEURS) as [DeclencheurId, ...DeclencheurId[]]),
    fenetreJours: z.number().int().min(1).max(90),
    entree: z.array(Critere).max(8),
    etapes: z.array(EtapeSchema).min(1).max(20),
    objectif: z.enum(["achat", "aucun"]),
    sortieSiConditions: z.boolean(),
    exclusions: z.array(z.enum(Object.keys(EXCLUSIONS) as [ExclusionId, ...ExclusionId[]])).max(4),
  })
  .strict();
export type Definition = z.infer<typeof DefinitionSchema>;

/** Refus lisible par la créatrice (le message est affiché tel quel dans l’Atelier). */
export class RefusParcours extends Error {}

export const nouvelId = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Durée d'une attente, en millisecondes. */
export const dureeMs = (e: { duree: number; unite: Unite }) => e.duree * (e.unite === "heures" ? 3_600_000 : 86_400_000);
