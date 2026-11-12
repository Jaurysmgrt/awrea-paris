/**
 * CRM de la Maison (cahier de l'Atelier du 10/11, § 1 et 5) : les règles, sans stockage ni réseau,
 * partagées par lib/crm (serveur), les pages de l'Atelier et les tests unitaires.
 *
 * Une fiche par adresse e-mail normalisée (minuscules, espaces retirés) : une inscription à la
 * lettre, un compte, une commande ou un rendez-vous complètent la même fiche, jamais une seconde.
 * Les fiches se lisent par fusion des sources existantes (comptes, commandes, rendez-vous, ancienne
 * liste des inscrites) avec ce que le CRM garde lui-même : statut de la lettre, preuve du
 * consentement, inscription en attente de confirmation, coordonnées corrigées par l'Atelier,
 * historique. Aucune donnée existante n'est déplacée ni effacée.
 *
 * Statut de la lettre : abonnée, non abonnée ou désinscrite. Seule une abonnée reçoit un e-mail
 * marketing (lettre, avant-premières, e-mails automatiques, futurs parcours) ; une désinscription
 * vaut partout. L'Atelier peut désinscrire une personne, jamais l'abonner : l'abonnement ne vient
 * que d'un consentement de la personne (case cochée puis lien de confirmation, ou case de son
 * compte, dont l'adresse est vérifiée par la connexion).
 */
import { segmentOf } from "@/lib/customers/segments";
import type { CustomerStats } from "@/lib/customers/types";
import type { OrderStatus } from "@/lib/commerce/types";

// ------------------------------------------------------------------ adresses

/** Adresse e-mail normalisée : minuscules, sans aucun espace (ni insécable, ni invisible). */
export const normaliserEmail = (email: string): string =>
  email
    .normalize("NFKC")
    .replace(/[\s​-‍⁠﻿]+/gu, "")
    .toLowerCase();

/**
 * Clé de comparaison d'une adresse pour le privilège de bienvenue et « déjà cliente » : l'adresse
 * normalisée, sans le « +… » de la partie locale (une même boîte reçoit « jeanne+2@ » et « jeanne@ »),
 * et pour Gmail sans les points de la partie locale, « googlemail.com » ramené à « gmail.com ».
 * Elle ne sert qu'à comparer : les e-mails partent toujours à l'adresse donnée.
 */
export function cleCanonique(email: string): string {
  const e = normaliserEmail(email);
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  let local = e.slice(0, at);
  let domaine = e.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domaine === "googlemail.com") domaine = "gmail.com";
  if (domaine === "gmail.com") local = local.replace(/\./g, "") || local;
  return `${local}@${domaine}`;
}

/** Adresse plausible (une seule « @ », un point dans le domaine). */
export const emailPlausible = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ------------------------------------------------------------------ modèle

export type StatutLettre = "abonnee" | "non-abonnee" | "desinscrite";

/** Preuve du consentement : le texte de la case cochée, sa date, sa source, et le clic de confirmation. */
export interface PreuveConsentement {
  texte: string;
  le: string;
  source: string;
  /** clic dans l'e-mail de confirmation, ou adresse vérifiée par la connexion au compte */
  confirmeLe?: string;
}

export type TypeEvenement = "inscription" | "confirmation" | "desinscription" | "compte" | "commande" | "rendez-vous" | "modification" | "privilege";

/** Un moment de l'histoire d'une fiche ; `detail` reste court et sans donnée sensible. */
export interface EvenementCRM {
  at: string;
  type: TypeEvenement;
  detail?: string;
}

/** Ce que le CRM garde lui-même pour une adresse (stockage technique, clé « crm:fiches »). */
export interface FicheCRM {
  email: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
  /** première trace dans le CRM */
  creeLe: string;
  /** statut de la lettre tenu par le CRM ; absent, il se déduit des sources existantes */
  lettre?: { statut: StatutLettre; depuis: string; source?: string; preuve?: PreuveConsentement };
  /**
   * inscription demandée, en attente du clic dans l'e-mail de confirmation ; les coordonnées données
   * avec la demande n'entrent dans la fiche qu'au clic (personne ne réécrit la fiche d'une autre)
   */
  attente?: { le: string; source: string; texte: string; coordonnees?: Coordonnees };
  historique: EvenementCRM[];
  modifieeLe?: string;
}

/** Prénom, nom et téléphone donnés par la personne. */
export interface Coordonnees {
  prenom?: string;
  nom?: string;
  telephone?: string;
}

/** Ancienne liste des inscrites (clé « newsletter:subscribers »), lue telle quelle. */
export interface AncienneInscrite {
  email: string;
  date?: string;
  source?: string;
  prenom?: string;
  nom?: string;
  telephone?: string;
}

/** Compte cliente (Supabase ou démonstration). */
export interface CompteSource {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  creeLe: string;
  cercle: boolean;
  /** case « lettres » cochée dans son compte, et depuis quand si on le sait */
  lettre: boolean;
  lettreLe: string | null;
}

export interface CommandeSource {
  number: string;
  email: string;
  createdAt: string;
  total: number;
  status: OrderStatus;
  prenom?: string;
  nom?: string;
  telephone?: string;
}

export interface RendezVousSource {
  email: string;
  name: string;
  phone?: string;
  start: string;
  createdAt: string;
  status: "confirme" | "annule";
  type: string;
}

export interface SourcesCRM {
  fiches: Record<string, FicheCRM>;
  anciennes: AncienneInscrite[];
  comptes: CompteSource[];
  commandes: CommandeSource[];
  rendezVous: RendezVousSource[];
  /** dernière désinscription notée par adresse normalisée (liste « newsletter:desinscriptions ») */
  desinscriptions?: Record<string, string>;
}

/** État de la lettre d'une adresse, tel que l'Atelier et les envois le lisent. */
export interface EtatLettre {
  statut: StatutLettre;
  depuis: string | null;
  source: string | null;
  preuve: PreuveConsentement | null;
  /** inscription demandée, pas encore confirmée */
  attente: { le: string; source: string } | null;
  /** consentement confirmé (lien de l'e-mail, ou adresse vérifiée par le compte) */
  confirmee: boolean;
}

export type SegmentCRM = "clientes" | "prospects" | "abonnees" | "nouvelles-inscrites" | "desinscrites";

/** Fiche fusionnée : les champs d'une cliente de l'Atelier, plus le téléphone, le compte et la lettre. */
export interface Contact extends CustomerStats {
  telephone: string | null;
  /** un compte existe pour cette adresse */
  compte: boolean;
  /** le CRM garde des données pour elle (inscription, preuve, coordonnées, historique) */
  donneesLettre: boolean;
  lettre: EtatLettre;
  segments: SegmentCRM[];
}

// ------------------------------------------------------------------ lettre

/**
 * Statut de la lettre d'une adresse. Le CRM fait foi dès qu'il a tranché ; sinon l'ancienne liste
 * des inscrites (consentement donné par une case cochée), puis la case « lettres » du compte.
 */
export function etatLettre(s: { fiche?: FicheCRM | null; ancienne?: AncienneInscrite | null; compte?: Pick<CompteSource, "lettre" | "lettreLe" | "creeLe"> | null; desinscriteLe?: string | null }): EtatLettre {
  const e = etatSelonSources(s);
  // filet de sécurité : une désinscription notée dans la liste des désinscriptions, plus récente que
  // l'accord (ou qu'un accord sans date), l'emporte même si la fiche n'a pas pu être mise à jour
  const d = s.desinscriteLe;
  if (e.statut !== "abonnee" || !d) return e;
  const accord = e.preuve?.confirmeLe ?? e.depuis;
  if (accord && accord > d) return e;
  return { ...e, statut: "desinscrite", depuis: d, source: "lien", confirmee: false };
}

/** Dernière désinscription de chaque adresse normalisée, dans la liste « newsletter:desinscriptions ». */
export function dernieresDesinscriptions(liste: readonly { email?: unknown; date?: unknown }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of liste) {
    if (typeof d?.email !== "string" || typeof d.date !== "string" || !Number.isFinite(Date.parse(d.date))) continue;
    const e = normaliserEmail(d.email);
    const le = new Date(d.date).toISOString();
    if (!out[e] || out[e] < le) out[e] = le;
  }
  return out;
}

function etatSelonSources(s: { fiche?: FicheCRM | null; ancienne?: AncienneInscrite | null; compte?: Pick<CompteSource, "lettre" | "lettreLe" | "creeLe"> | null }): EtatLettre {
  const attente = s.fiche?.attente ? { le: s.fiche.attente.le, source: s.fiche.attente.source } : null;
  const l = s.fiche?.lettre;
  if (l) return { statut: l.statut, depuis: l.depuis, source: l.source ?? null, preuve: l.preuve ?? null, attente, confirmee: l.statut === "abonnee" && Boolean(l.preuve?.confirmeLe) };
  if (s.ancienne) return { statut: "abonnee", depuis: s.ancienne.date ?? null, source: s.ancienne.source ?? "lettre", preuve: null, attente, confirmee: false };
  if (s.compte?.lettre) return { statut: "abonnee", depuis: s.compte.lettreLe ?? s.compte.creeLe, source: "compte", preuve: null, attente, confirmee: true };
  return { statut: "non-abonnee", depuis: null, source: null, preuve: null, attente, confirmee: false };
}

/**
 * Règle unique de tous les envois marketing (lettre, avant-premières, e-mails automatiques,
 * parcours) : seule une abonnée les reçoit. Une inscription en attente de confirmation, une
 * personne jamais inscrite ou désinscrite n'en reçoit aucun.
 */
export const peutRecevoirMarketingSelon = (e: Pick<EtatLettre, "statut">): boolean => e.statut === "abonnee";

export const LIBELLE_STATUT: Record<StatutLettre, string> = { abonnee: "Abonnée", "non-abonnee": "Non abonnée", desinscrite: "Désinscrite" };

/** « Abonnée », « Non abonnée · à confirmer »… */
export const libelleLettre = (e: Pick<EtatLettre, "statut" | "attente">): string => `${LIBELLE_STATUT[e.statut]}${e.attente && e.statut !== "abonnee" ? " · à confirmer" : ""}`;

const LIBELLE_SOURCE: Record<string, string> = {
  fenetre: "Fenêtre de bienvenue",
  footer: "Pied de page",
  "pied-de-page": "Pied de page",
  home: "Page d’accueil",
  accueil: "Page d’accueil",
  page: "Formulaire d’une page",
  bientot: "Page « Bientôt »",
  compte: "Son compte",
  commande: "À la commande",
  "rendez-vous": "Rendez-vous",
  atelier: "L’atelier",
  lien: "Lien de la lettre",
};

/** Source d'une inscription en clair (une source inconnue vient d'un formulaire du site). */
export const libelleSource = (source: string | null | undefined): string => (source ? (LIBELLE_SOURCE[source] ?? "Formulaire du site") : "");

// ------------------------------------------------------------------ fiche : changements

const HISTORIQUE_MAX = 60;

export const nouvelleFiche = (email: string, maintenant: Date): FicheCRM => ({ email: normaliserEmail(email), creeLe: maintenant.toISOString(), historique: [] });

/** Ajoute un moment à l'histoire (les plus récents d'abord, 60 au plus). */
export const avecEvenement = (f: FicheCRM, e: EvenementCRM): FicheCRM => ({ ...f, historique: [e, ...f.historique].slice(0, HISTORIQUE_MAX) });

const nettoyer = (v: string | undefined | null) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, 120) : undefined;
};

type CoordonneesSaisies = { prenom?: string | null; nom?: string | null; telephone?: string | null };

/** Coordonnées nettoyées (vides retirées, 120 caractères au plus). */
export function coordonneesPropres(c: CoordonneesSaisies | null | undefined): Coordonnees {
  const prenom = nettoyer(c?.prenom);
  const nom = nettoyer(c?.nom);
  const telephone = nettoyer(c?.telephone);
  return { ...(prenom ? { prenom } : {}), ...(nom ? { nom } : {}), ...(telephone ? { telephone } : {}) };
}

/**
 * Coordonnées données par la personne, appliquées au clic de confirmation : elles complètent la
 * fiche sans jamais rien remplacer, ni une valeur de la fiche, ni une valeur de son compte (`garder`).
 */
export function avecCoordonnees(f: FicheCRM, c: CoordonneesSaisies, garder: CoordonneesSaisies | null = null): FicheCRM {
  const propres = coordonneesPropres(c);
  const next: FicheCRM = { ...f };
  let change = false;
  for (const k of ["prenom", "nom", "telephone"] as const) {
    const v = propres[k];
    if (!v || f[k] || nettoyer(garder?.[k])) continue;
    next[k] = v;
    change = true;
  }
  return change ? next : f;
}

/**
 * Inscription demandée (case cochée) : en attente du clic dans l'e-mail de confirmation. La fiche
 * elle-même ne change pas : les coordonnées attendent le clic avec la demande.
 */
export function demander(f: FicheCRM, d: { source: string; texte: string; coordonnees?: CoordonneesSaisies }, maintenant: Date): FicheCRM {
  const le = maintenant.toISOString();
  const coordonnees = coordonneesPropres(d.coordonnees);
  return avecEvenement({ ...f, attente: { le, source: d.source, texte: d.texte, ...(Object.keys(coordonnees).length ? { coordonnees } : {}) } }, { at: le, type: "inscription", detail: d.source });
}

/** Une inscription attend-elle son clic depuis plus de `jours` jours (lien expiré) ? */
export const attentePerimee = (f: FicheCRM, maintenant: Date, jours: number): boolean => Boolean(f.attente && maintenant.getTime() - Date.parse(f.attente.le) > jours * 86_400_000);

/**
 * Purge d'une inscription jamais confirmée (son lien a expiré) : la demande et ses coordonnées
 * s'effacent ; une fiche qui ne gardait rien d'autre disparaît (aucune trace d'une adresse qui n'a
 * jamais confirmé). Renvoie null si rien ne change, `{ fiche: null }` si la fiche disparaît.
 */
export function purgerAttente(f: FicheCRM, maintenant: Date, jours: number): { fiche: FicheCRM | null } | null {
  if (!attentePerimee(f, maintenant, jours)) return null;
  const { attente: _a, ...reste } = f;
  void _a;
  const vide = !reste.lettre && !reste.prenom && !reste.nom && !reste.telephone && !reste.modifieeLe && reste.historique.every((e) => e.type === "inscription");
  return { fiche: vide ? null : reste };
}

/**
 * Clic dans l'e-mail de confirmation. Renvoie la fiche abonnée, `nouvelle` si elle ne l'était pas
 * encore ; `deja` si son inscription était déjà confirmée (le lien est rouvert) ; null si aucune
 * inscription n'attend (elle s'est désinscrite depuis, ou le lien ne correspond à rien).
 */
export function confirmer(f: FicheCRM, avant: EtatLettre, maintenant: Date, compte: CoordonneesSaisies | null = null): { fiche: FicheCRM; nouvelle: boolean; deja: boolean } | null {
  if (!f.attente) return avant.statut === "abonnee" && avant.confirmee ? { fiche: f, nouvelle: false, deja: true } : null;
  const le = maintenant.toISOString();
  const { attente, ...sans } = f;
  // les coordonnées de la demande entrent dans la fiche, sans rien remplacer (ni la fiche, ni le compte)
  const reste = avecCoordonnees(sans, attente.coordonnees ?? {}, compte);
  const fiche: FicheCRM = {
    ...reste,
    lettre: { statut: "abonnee", depuis: avant.statut === "abonnee" && avant.depuis ? avant.depuis : le, source: attente.source, preuve: { texte: attente.texte, le: attente.le, source: attente.source, confirmeLe: le } },
  };
  return { fiche: avecEvenement(fiche, { at: le, type: "confirmation", detail: attente.source }), nouvelle: avant.statut !== "abonnee", deja: false };
}

/** Case « lettres » cochée dans son compte : consentement direct, l'adresse est vérifiée par la connexion. */
export function abonnerParCompte(f: FicheCRM, avant: EtatLettre, texte: string, maintenant: Date): FicheCRM {
  const le = maintenant.toISOString();
  if (f.lettre?.statut === "abonnee" && f.lettre.preuve?.confirmeLe) return f;
  const { attente: _attente, ...reste } = f;
  void _attente;
  return avecEvenement(
    { ...reste, lettre: { statut: "abonnee", depuis: avant.statut === "abonnee" && avant.depuis ? avant.depuis : le, source: "compte", preuve: { texte, le, source: "compte", confirmeLe: le } } },
    { at: le, type: "confirmation", detail: "compte" },
  );
}

/**
 * Désinscription (lien de la lettre, son compte, l'atelier, un effacement) : elle vaut partout et
 * annule une inscription en attente. `par` : la personne de l'atelier qui l'a faite.
 */
export function desinscrire(f: FicheCRM, d: { source: string; par?: string }, maintenant: Date): FicheCRM {
  const le = maintenant.toISOString();
  const { attente: _attente, ...reste } = f;
  void _attente;
  const deja = f.lettre?.statut === "desinscrite";
  const fiche: FicheCRM = { ...reste, lettre: { statut: "desinscrite", depuis: deja ? f.lettre!.depuis : le, source: d.source, ...(f.lettre?.preuve ? { preuve: f.lettre.preuve } : {}) } };
  return deja && !f.attente ? fiche : avecEvenement(fiche, { at: le, type: "desinscription", detail: d.par ? `${d.source} (${d.par})` : d.source });
}

/** Coordonnées corrigées dans l'Atelier ; un champ vide efface la valeur corrigée. */
export function modifier(f: FicheCRM, patch: { prenom?: string | null; nom?: string | null; telephone?: string | null }, par: string, maintenant: Date): FicheCRM {
  const next: FicheCRM = { ...f };
  const champs: string[] = [];
  for (const k of ["prenom", "nom", "telephone"] as const) {
    if (patch[k] === undefined) continue;
    const v = nettoyer(patch[k]);
    if (v === f[k]) continue;
    if (v) next[k] = v;
    else delete next[k];
    champs.push(k);
  }
  if (!champs.length) return f;
  const le = maintenant.toISOString();
  return avecEvenement({ ...next, modifieeLe: le }, { at: le, type: "modification", detail: `${champs.join(", ")} (${par})` });
}

// ------------------------------------------------------------------ fusion

/** Commande comptée comme une vente (ni en attente de paiement, ni remboursée, ni bloquée). */
export const estVente = (status: OrderStatus): boolean => status !== "pending" && status !== "refunded" && status !== "blocked";

const premier = (a: string | null | undefined, b: string | null | undefined) => (!a ? (b ?? null) : !b ? a : a < b ? a : b);

const coupeNom = (name: string): { prenom?: string; nom?: string } => {
  const [p, ...r] = name.trim().split(/\s+/);
  return { prenom: p || undefined, nom: r.join(" ") || undefined };
};

/**
 * Toutes les fiches, une par adresse normalisée : comptes, commandes payées, ancienne liste des
 * inscrites, fiches du CRM et rendez-vous réunis. `idDe` donne l'identifiant d'une personne sans
 * compte (le même que celui de ses commandes dans l'Atelier).
 */
export function fusionnerContacts(s: SourcesCRM, idDe: (email: string) => string, maintenant: Date): Contact[] {
  type Brouillon = {
    email: string;
    id?: string;
    compte?: CompteSource;
    ancienne?: AncienneInscrite;
    fiche?: FicheCRM;
    commandes: CommandeSource[];
    rdv: RendezVousSource[];
  };
  const parEmail = new Map<string, Brouillon>();
  const de = (email: string): Brouillon | null => {
    const e = normaliserEmail(email);
    if (!emailPlausible(e)) return null;
    let b = parEmail.get(e);
    if (!b) parEmail.set(e, (b = { email: e, commandes: [], rdv: [] }));
    return b;
  };
  for (const c of s.comptes) {
    const b = de(c.email);
    if (b) Object.assign(b, { compte: c, id: c.id });
  }
  for (const o of s.commandes) if (estVente(o.status)) de(o.email)?.commandes.push(o);
  for (const a of s.anciennes) {
    const b = de(a.email);
    if (b && !b.ancienne) b.ancienne = a;
  }
  for (const [email, f] of Object.entries(s.fiches)) {
    const b = de(email);
    if (b) b.fiche = f;
  }
  for (const r of s.rendezVous) de(r.email)?.rdv.push(r);

  const out: Contact[] = [];
  for (const b of parEmail.values()) {
    const lettre = etatLettre({ fiche: b.fiche, ancienne: b.ancienne, compte: b.compte, desinscriteLe: s.desinscriptions?.[b.email] ?? null });
    // les commandes, la plus récente d'abord : l'adresse de la dernière donne le nom à défaut d'autre
    const commandes = [...b.commandes].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    const derniere = commandes[0];
    const rdv = [...b.rdv].sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    const nomRdv = rdv ? coupeNom(rdv.name) : {};
    const prenom = b.fiche?.prenom ?? b.compte?.prenom ?? b.ancienne?.prenom ?? derniere?.prenom ?? nomRdv.prenom ?? null;
    const nom = b.fiche?.nom ?? b.compte?.nom ?? b.ancienne?.nom ?? derniere?.nom ?? nomRdv.nom ?? null;
    const telephone = b.fiche?.telephone ?? b.compte?.telephone ?? b.ancienne?.telephone ?? derniere?.telephone ?? rdv?.phone ?? null;
    let creeLe: string | null = null;
    for (const d of [b.compte?.creeLe, b.ancienne?.date, b.fiche?.creeLe, ...b.commandes.map((o) => o.createdAt), ...b.rdv.map((r) => r.createdAt)]) creeLe = premier(creeLe, d);
    const ordersCount = commandes.length;
    const totalSpent = commandes.reduce((t, o) => t + o.total, 0);
    const base = {
      id: b.id ?? idDe(b.email),
      email: b.compte?.email ?? b.email,
      firstName: prenom,
      lastName: nom,
      createdAt: creeLe ?? maintenant.toISOString(),
      cercleMember: Boolean(b.compte?.cercle),
      marketingEmail: peutRecevoirMarketingSelon(lettre),
      ordersCount,
      totalSpent,
      lastOrderAt: derniere?.createdAt ?? null,
      segment: segmentOf(ordersCount, totalSpent),
      telephone,
      compte: Boolean(b.compte),
      donneesLettre: Boolean(b.fiche || b.ancienne),
      lettre,
    };
    out.push({ ...base, segments: segmentsDe(base, maintenant) });
  }
  return out.sort((a, b) => b.totalSpent - a.totalSpent || b.createdAt.localeCompare(a.createdAt));
}

// ------------------------------------------------------------------ segments

/** Une inscrite reste « nouvelle » 30 jours. */
export const JOURS_NOUVELLE_INSCRITE = 30;

export const SEGMENTS_CRM: readonly { id: SegmentCRM; label: string; regle: string }[] = [
  { id: "clientes", label: "Clientes", regle: "au moins une commande payée" },
  { id: "prospects", label: "Prospects", regle: "inscrites à la lettre, sans commande" },
  { id: "abonnees", label: "Abonnées", regle: "reçoivent la lettre" },
  { id: "nouvelles-inscrites", label: "Nouvelles inscrites", regle: `abonnées depuis moins de ${JOURS_NOUVELLE_INSCRITE} jours` },
  { id: "desinscrites", label: "Désinscrites", regle: "ne reçoivent plus rien de la Maison, hors commandes" },
];

export const estSegmentCRM = (v: unknown): v is SegmentCRM => SEGMENTS_CRM.some((s) => s.id === v);

/** Segments d'une fiche : une personne peut en avoir plusieurs (cliente et abonnée, par exemple). */
export function segmentsDe(c: { ordersCount: number; lettre: Pick<EtatLettre, "statut" | "depuis" | "attente"> }, maintenant: Date): SegmentCRM[] {
  const out: SegmentCRM[] = [];
  const abonnee = c.lettre.statut === "abonnee";
  if (c.ordersCount > 0) out.push("clientes");
  else if (abonnee || c.lettre.attente) out.push("prospects");
  if (abonnee) {
    out.push("abonnees");
    const depuis = c.lettre.depuis ? Date.parse(c.lettre.depuis) : NaN;
    if (Number.isFinite(depuis) && maintenant.getTime() - depuis <= JOURS_NOUVELLE_INSCRITE * 86_400_000) out.push("nouvelles-inscrites");
  }
  if (c.lettre.statut === "desinscrite") out.push("desinscrites");
  return out;
}

export function compterParSegment(liste: readonly Pick<Contact, "segments">[]): Record<SegmentCRM, number> {
  const n = Object.fromEntries(SEGMENTS_CRM.map((s) => [s.id, 0])) as Record<SegmentCRM, number>;
  for (const c of liste) for (const s of c.segments) n[s]++;
  return n;
}

// ------------------------------------------------------------------ historique

export interface MomentFiche {
  at: string;
  type: TypeEvenement;
  texte: string;
}

const formatEuros = (centimes: number) => `${(centimes / 100).toFixed(2).replace(".", ",")} €`;

/** Histoire d'une fiche, la plus récente d'abord : ce que le CRM a noté, ses commandes et ses rendez-vous. */
export function historique(s: { fiche?: FicheCRM | null; ancienne?: AncienneInscrite | null; compte?: Pick<CompteSource, "creeLe"> | null; commandes: CommandeSource[]; rendezVous: RendezVousSource[] }): MomentFiche[] {
  const out: MomentFiche[] = [];
  for (const e of s.fiche?.historique ?? []) out.push({ at: e.at, type: e.type, texte: texteEvenement(e) });
  if (s.ancienne?.date && !(s.fiche?.historique ?? []).some((e) => e.type === "inscription" || e.type === "confirmation")) out.push({ at: s.ancienne.date, type: "inscription", texte: `Inscription à la lettre (${libelleSource(s.ancienne.source ?? "lettre").toLowerCase()})` });
  if (s.compte) out.push({ at: s.compte.creeLe, type: "compte", texte: "Compte créé" });
  for (const o of s.commandes) out.push({ at: o.createdAt, type: "commande", texte: `Commande ${o.number}, ${formatEuros(o.total)}${estVente(o.status) ? "" : o.status === "pending" ? " (paiement non abouti)" : o.status === "refunded" ? " (remboursée)" : " (mise de côté)"}` });
  for (const r of s.rendezVous) out.push({ at: r.createdAt, type: "rendez-vous", texte: `Rendez-vous ${r.type === "sur-mesure" ? "sur mesure" : "en visio"} pour le ${new Date(r.start).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}${r.status === "annule" ? " (annulé)" : ""}` });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

function texteEvenement(e: EvenementCRM): string {
  const source = libelleSource(e.detail ?? "").toLowerCase();
  switch (e.type) {
    case "inscription":
      return `Inscription demandée${source ? ` (${source})` : ""}, en attente de confirmation`;
    case "confirmation":
      return e.detail === "compte" ? "Inscription à la lettre depuis son compte" : `Inscription confirmée par le lien de l’e-mail${source ? ` (${source})` : ""}`;
    case "desinscription":
      return `Désinscription${e.detail ? ` (${libelleSource(e.detail.split(" (")[0]).toLowerCase()}${e.detail.includes(" (") ? `, ${e.detail.split(" (")[1].replace(/\)$/, "")}` : ""})` : ""}`;
    case "modification":
      return `Coordonnées corrigées${e.detail ? ` : ${e.detail.replace("prenom", "prénom").replace("telephone", "téléphone")}` : ""}`;
    case "privilege":
      return e.detail ?? "Privilège de bienvenue";
    case "compte":
      return "Compte créé";
    case "commande":
      return e.detail ? `Commande ${e.detail}` : "Commande";
    case "rendez-vous":
      return e.detail ? `Rendez-vous ${e.detail}` : "Rendez-vous";
  }
}
