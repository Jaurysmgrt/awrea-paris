/**
 * Moteur des parcours de vente : module pur, sans lecture ni écriture. Il reçoit les parcours, les
 * personnes, l'état et l'heure, et rend le nouvel état, les e-mails à faire partir et les lignes du
 * journal. Le passage de la tâche planifiée (lib/marketing/parcours/index.ts) lui fournit les
 * données et fait partir (ou simule) les e-mails : tout se teste ici sans réseau
 * (tests/unit/parcours.test.ts).
 *
 * Règles (cahier de l'Atelier du 10/11, § 4 et 5) :
 * - seules les personnes qui ont accepté les e-mails marketing entrent, une seule fois par parcours ;
 * - sortie immédiate à la désinscription, à l'objectif atteint (un achat après l'entrée), quand les
 *   conditions d'entrée ne sont plus remplies, ou à une condition d'étape non remplie ;
 * - un e-mail marketing au plus tous les N jours par personne, tous parcours confondus, en comptant
 *   aussi la lettre et les e-mails automatiques de la Maison ; jamais deux fois le même e-mail ;
 * - l'état avance avant l'envoi : un passage rejoué ou interrompu ne renvoie jamais rien.
 */
import { dureeMs, type Contact, type CritereId, type DeclencheurId, type Etat, type Interrupteur, type LigneJournal, type Mode, type Parcours, type RaisonSortie, type Reglages, type Suivi } from "@/lib/marketing/parcours/types";
import { PLAFOND_MAX, PLAFOND_MIN } from "@/lib/marketing/parcours/types";

const JOUR = 86_400_000;
/** La tâche passe une fois par jour, jamais à la seconde près : une étape prête dans l'heure part au passage. */
export const TOLERANCE_MS = 60 * 60 * 1000;
/** Garde-fou : jamais plus d'étapes enchaînées pour une personne en un passage. */
const ETAPES_PAR_PASSAGE = 50;

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.NaN);

/** Date de l'évènement qui fait entrer une personne dans un parcours, ou null s'il n'a pas eu lieu. */
export function dateEvenement(d: DeclencheurId, c: Contact): string | null {
  switch (d) {
    case "inscription":
      return c.inscriteLe;
    case "interet":
      return c.interetLe;
    case "panier":
      return c.panierLe;
    case "premiere-commande":
      return c.commandes[0] ?? null;
    case "commande":
      return c.commandes[c.commandes.length - 1] ?? null;
  }
}

export function critere(id: CritereId, c: Contact): boolean {
  switch (id) {
    case "sans-commande":
      return c.commandes.length === 0;
    case "avec-commande":
      return c.commandes.length > 0;
    case "fidele":
      return c.segment === "fidele" || c.segment === "vip";
    case "vip":
      return c.segment === "vip";
    case "cercle":
      return c.cercle;
    case "compte":
      return c.compte;
    case "sans-compte":
      return !c.compte;
    case "panier":
      return Boolean(c.panierLe);
  }
}

export const criteres = (ids: CritereId[], c: Contact) => ids.every((id) => critere(id, c));

/** Une commande payée après ce moment (l'objectif d'un parcours). */
export const achatDepuis = (c: Contact, iso: string) => c.commandes.some((d) => t(d) > t(iso));

export const plafondMs = (r: Reglages) => Math.min(PLAFOND_MAX, Math.max(PLAFOND_MIN, Math.round(r.plafondJours || PLAFOND_MIN))) * JOUR;

/**
 * Les deux clés des envois réels : PARCOURS_ENVOIS_REELS=1, posée dans Vercel par la Maison, et
 * l'interrupteur de l'Atelier, confirmé par la créatrice. Sans l'une des deux : simulation.
 */
export function modeDesEnvois(variable: string | undefined, interrupteur: Interrupteur | null | undefined): Mode {
  return variable?.trim() === "1" && interrupteur?.actif === true ? "reel" : "simulation";
}

export interface EmailEtat {
  /** publié, sans texte entre crochets */
  pret: boolean;
  sujet: string;
}

export interface Entree {
  parcours: Parcours[];
  contacts: Contact[];
  etat: Etat;
  reglages: Reglages;
  /** e-mails utilisables dans un parcours, par identifiant de document */
  emails: Record<string, EmailEtat>;
  maintenant: Date;
  mode: Mode;
}

export interface Envoi {
  parcours: string;
  parcoursNom: string;
  etape: string;
  email: string;
  prenom: string | null;
  emailId: string;
  sujet: string;
}

export interface Resume {
  entrees: number;
  envois: number;
  sorties: number;
  /** e-mails repoussés au passage suivant par le plafond */
  reportes: number;
  /** étapes arrêtées sur un e-mail pas encore prêt (non publié, ou textes entre crochets) */
  enAttente: number;
}

export interface Resultat {
  etat: Etat;
  envois: Envoi[];
  journal: LigneJournal[];
  resume: Resume;
}

export function avancer(e: Entree): Resultat {
  const etat: Etat = structuredClone(e.etat);
  const now = e.maintenant.getTime();
  const nowIso = e.maintenant.toISOString();
  const plafond = plafondMs(e.reglages);
  const contacts = new Map(
    e.contacts.map((c) => {
      const email = c.email.trim().toLowerCase();
      return [email, { ...c, email }];
    }),
  );
  const actifs = e.parcours.filter((p) => p.statut === "actif");
  const envois: Envoi[] = [];
  const journal: LigneJournal[] = [];
  const resume: Resume = { entrees: 0, envois: 0, sorties: 0, reportes: 0, enAttente: 0 };

  const ligne = (p: Parcours, email: string, l: Partial<LigneJournal> & Pick<LigneJournal, "evenement">): LigneJournal => ({ at: nowIso, mode: e.mode, parcours: p.id, parcoursNom: p.nom, email, ...l });
  const sortir = (p: Parcours, s: Suivi, raison: RaisonSortie) => {
    s.fin = { le: nowIso, raison };
    journal.push(ligne(p, s.email, { evenement: "sortie", raison }));
    resume.sorties++;
  };
  /** déjà en route dans un autre parcours (actif ou en pause) */
  const ailleurs = (email: string, sauf: string) => e.parcours.some((p) => p.id !== sauf && p.statut !== "brouillon" && etat.suivis[p.id]?.[email] && !etat.suivis[p.id][email].fin);

  const derouler = (p: Parcours, s: Suivi, c: Contact) => {
    for (let garde = 0; garde < ETAPES_PAR_PASSAGE; garde++) {
      if (s.etape >= p.etapes.length) return sortir(p, s, "termine");
      if (t(s.pretLe) > now + TOLERANCE_MS) return;
      const et = p.etapes[s.etape];
      if (et.type === "attente") {
        s.pretLe = new Date(t(s.pretLe) + dureeMs(et)).toISOString();
        s.etape++;
        continue;
      }
      if (et.type === "condition") {
        if (!critere(et.critere, c)) return sortir(p, s, "condition");
        s.etape++;
        continue;
      }
      const personne = (etat.personnes[c.email] ??= { recus: [] });
      // jamais deux fois le même e-mail, même d'un autre parcours : l'étape est passée
      if (personne.recus.includes(et.email)) {
        s.etape++;
        continue;
      }
      const info = e.emails[et.email];
      if (!info?.pret) {
        resume.enAttente++;
        return;
      }
      const dernier = Math.max(t(personne.dernier) || 0, t(c.dernierMarketing) || 0);
      if (dernier && now - dernier < plafond - TOLERANCE_MS) {
        resume.reportes++;
        return;
      }
      // l'état avance avant l'envoi (réservation) : jamais deux fois, même si l'envoi échoue
      personne.recus.push(et.email);
      personne.dernier = nowIso;
      s.etape++;
      s.envoyes++;
      s.pretLe = nowIso;
      envois.push({ parcours: p.id, parcoursNom: p.nom, etape: et.id, email: c.email, prenom: c.prenom, emailId: et.email, sujet: info.sujet });
      resume.envois++;
    }
  };

  // 1. les personnes déjà en route : sorties d'abord, puis les étapes prêtes
  for (const p of actifs) {
    const suivis = (etat.suivis[p.id] ??= {});
    for (const s of Object.values(suivis)) {
      if (s.fin) continue;
      const c = contacts.get(s.email);
      if (!c?.marketing) {
        sortir(p, s, "desinscription");
        continue;
      }
      if (p.objectif === "achat" && achatDepuis(c, s.entreeLe)) {
        sortir(p, s, "objectif");
        continue;
      }
      if (p.sortieSiConditions && !criteres(p.entree, c)) {
        sortir(p, s, "conditions");
        continue;
      }
      derouler(p, s, c);
    }
  }

  // 2. les entrées : évènement récent, consentement, conditions, exclusions ; une seule fois par parcours
  for (const p of actifs) {
    const suivis = etat.suivis[p.id];
    for (const [email, c] of contacts) {
      if (suivis[email] || !c.marketing) continue;
      const evt = dateEvenement(p.declencheur, c);
      const quand = t(evt);
      if (!evt || Number.isNaN(quand) || quand > now + TOLERANCE_MS || now - quand > p.fenetreJours * JOUR) continue;
      if (!criteres(p.entree, c)) continue;
      if (p.objectif === "achat" && achatDepuis(c, evt)) continue;
      if (p.exclusions.includes("autre-parcours") && ailleurs(email, p.id)) continue;
      if (p.exclusions.includes("commande-recente") && c.commandes.some((d) => now - t(d) < 30 * JOUR)) continue;
      const s: Suivi = { email, entreeLe: nowIso, etape: 0, pretLe: nowIso, envoyes: 0 };
      suivis[email] = s;
      journal.push(ligne(p, email, { evenement: "entree" }));
      resume.entrees++;
      derouler(p, s, c);
    }
  }

  return { etat, envois, journal, resume };
}

/**
 * Ce qui partirait dans les prochains jours, si personne n'achète ni ne se désinscrit d'ici là :
 * un passage par jour, sur une copie de l'état (rien n'est enregistré).
 */
export function prevoir(e: Entree, jours = 30, limite = 200): (Envoi & { le: string })[] {
  let etat = e.etat;
  const out: (Envoi & { le: string })[] = [];
  for (let d = 0; d <= jours && out.length < limite; d++) {
    const maintenant = new Date(e.maintenant.getTime() + d * JOUR);
    const r = avancer({ ...e, etat, maintenant });
    etat = r.etat;
    for (const v of r.envois) out.push({ ...v, le: maintenant.toISOString() });
  }
  return out.slice(0, limite);
}

export interface Statistiques {
  entrees: number;
  enCours: number;
  /** e-mails partis (envois réels) ou qui seraient partis (simulation) */
  messages: number;
  /** personnes qui ont acheté après leur entrée dans le parcours */
  conversions: number;
}

export function statistiques(p: Pick<Parcours, "id">, etat: Etat, contacts: Contact[]): Statistiques {
  const suivis = Object.values(etat.suivis[p.id] ?? {});
  const parEmail = new Map(contacts.map((c) => [c.email.trim().toLowerCase(), c]));
  return {
    entrees: suivis.length,
    enCours: suivis.filter((s) => !s.fin).length,
    messages: suivis.reduce((n, s) => n + s.envoyes, 0),
    conversions: suivis.filter((s) => {
      const c = parEmail.get(s.email);
      return c ? achatDepuis(c, s.entreeLe) : false;
    }).length,
  };
}

// ------------------------------------------------------------------ un passage complet
/** Ce dont un passage a besoin : le stockage, les personnes, l'envoi (lib/marketing/parcours/index.ts). */
export interface Ports {
  /** prend le verrou du passage ; null s'il est déjà pris (un autre passage tourne) */
  verrou(): Promise<(() => Promise<void>) | null>;
  mode(): Promise<Mode>;
  parcours(): Promise<Parcours[]>;
  reglages(): Promise<Reglages>;
  contacts(): Promise<Contact[]>;
  emails(): Promise<Record<string, EmailEtat>>;
  lireEtat(mode: Mode): Promise<Etat>;
  ecrireEtat(mode: Mode, etat: Etat): Promise<void>;
  /** envoi réel d'un e-mail : jamais appelé en simulation */
  envoyer(envoi: Envoi): Promise<void>;
  journal(lignes: LigneJournal[]): Promise<void>;
}

export interface Bilan extends Resume {
  at: string;
  mode: Mode;
  erreurs: number;
  /** un autre passage tournait déjà : rien n'a été fait */
  occupe?: boolean;
}

export async function passage(ports: Ports, maintenant = new Date()): Promise<Bilan> {
  const at = maintenant.toISOString();
  const vide = (mode: Mode, occupe?: boolean): Bilan => ({ at, mode, entrees: 0, envois: 0, sorties: 0, reportes: 0, enAttente: 0, erreurs: 0, ...(occupe ? { occupe } : {}) });
  const rendre = await ports.verrou();
  if (!rendre) return vide(await ports.mode(), true);
  try {
    const [mode, parcours] = await Promise.all([ports.mode(), ports.parcours()]);
    if (!parcours.some((p) => p.statut === "actif")) return vide(mode);
    const [reglages, contacts, emails, etat] = await Promise.all([ports.reglages(), ports.contacts(), ports.emails(), ports.lireEtat(mode)]);
    const r = avancer({ parcours, contacts, etat, reglages, emails, maintenant, mode });
    // l'état est enregistré avant tout envoi : un passage rejoué ou interrompu ne renvoie rien
    await ports.ecrireEtat(mode, r.etat);
    const lignes = [...r.journal];
    let erreurs = 0;
    for (const v of r.envois) {
      const l: LigneJournal = { at, mode, parcours: v.parcours, parcoursNom: v.parcoursNom, email: v.email, evenement: "email", emailId: v.emailId, sujet: v.sujet };
      if (mode !== "reel") {
        lignes.push(l);
        continue;
      }
      try {
        await ports.envoyer(v);
        lignes.push(l);
      } catch (err) {
        erreurs++;
        lignes.push({ ...l, evenement: "erreur", detail: err instanceof Error ? err.message.slice(0, 200) : "Envoi impossible" });
      }
    }
    await ports.journal(lignes);
    return { at, mode, ...r.resume, erreurs };
  } finally {
    await rendre();
  }
}
