/**
 * Google Agenda, côté serveur : le moteur (lib/google-agenda/synchro.ts) branché sur le stockage
 * du site (Upstash, ou fichier local en démonstration) et sur les rendez-vous (lib/appointments.ts).
 *
 * Sans GOOGLE_CALENDAR_CLIENT_ID et GOOGLE_CALENDAR_CLIENT_SECRET, rien ne se connecte : l'Atelier
 * dit que la connexion n'est pas encore branchée, et l'abonnement iCal continue de servir.
 * La connexion elle-même (OAuth 2.0) se fait dans l'Atelier › Rendez-vous :
 * app/api/gestion/agenda-google/route.ts et app/gestion/agenda-google/page.tsx.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { kv } from "@/lib/store";
import { sessionSecret } from "@/lib/auth/session";
import { atelierBase, ATELIER_INTERNAL } from "@/lib/admin/path";
import { siteUrl } from "@/lib/seo/metadata";
import { APPOINTMENT_TYPES, listAppointments, noterGoogle, type Appointment } from "@/lib/appointments";
import { configGoogle, etatSynchro, type ConfigGoogle, type EtatSynchro, type RendezVousGoogle } from "@/lib/google-agenda/regles";
import { moteurGoogle, type Bilan, type ConnexionGoogle, type MoteurGoogle } from "@/lib/google-agenda/synchro";

const CONNEXION = "agenda-google:connexion";

type Plage = { start: number; end: number };
type Cache = { jusqua: number; jours: number; plages: Promise<Plage[]> };
/** Cache des moments pris dans l'agenda Google : cinq minutes, une minute après un échec. */
let occupe: Cache | null = null;

/** Adresse de retour à déclarer chez Google, à l'adresse secrète de l'Atelier. */
export const adresseRetour = () => `${siteUrl}${atelierBase() ?? ATELIER_INTERNAL}/agenda-google`;

/** Chemin public de la route de l'Atelier qui reçoit le cookie de la connexion en cours. */
export const cheminFlux = () => `${atelierBase() ?? ATELIER_INTERNAL}/api/agenda-google`;

const libelle = (a: RendezVousGoogle) => APPOINTMENT_TYPES[a.type]?.label ?? "Rendez-vous";

const g = globalThis as unknown as { __awreaGoogle?: { config: ConfigGoogle; moteur: MoteurGoogle } };

/** Le moteur, ou null tant que la connexion n'est pas branchée (variables d'environnement). */
function moteur(): { config: ConfigGoogle; moteur: MoteurGoogle } | null {
  const config = configGoogle();
  if (!config) return null;
  if (g.__awreaGoogle) return g.__awreaGoogle;
  const m = moteurGoogle({
    config,
    secret: config.cle ?? sessionSecret(),
    libelle,
    depot: { lister: listAppointments, noter: noterGoogle },
    coffre: {
      lire: () => kv.get<ConnexionGoogle>(CONNEXION),
      ecrire: (c) => (c ? kv.set(CONNEXION, c) : kv.del(CONNEXION)),
      verrou: async (cle) => {
        const jeton = randomBytes(8).toString("hex");
        return (await kv.prendre(cle, jeton, 30_000)) ? () => kv.rendre(cle, jeton) : null;
      },
    },
  });
  return (g.__awreaGoogle = { config, moteur: m });
}

export const googleBranche = () => Boolean(configGoogle());

export type EtatConnexion = "non-branche" | "deconnecte" | "connecte" | "a-reconnecter";

/** Ce que l'Atelier montre : jamais le jeton. */
export interface VueGoogle {
  etat: EtatConnexion;
  le?: string;
  calendrier?: string;
  fuseau?: string;
  erreur?: string;
  enAttente: number;
  aRefaire: number;
}

export async function vueGoogle(liste?: Appointment[], maintenant = new Date()): Promise<VueGoogle> {
  if (!googleBranche()) return { etat: "non-branche", enAttente: 0, aRefaire: 0 };
  const c = await kv.get<ConnexionGoogle>(CONNEXION).catch(() => null);
  const rdv = liste ?? (await listAppointments());
  const etats = rdv.map((a) => etatSynchro(a, libelle(a), maintenant));
  return {
    etat: c?.etat ?? "deconnecte",
    le: c?.le,
    calendrier: c?.calendrier,
    fuseau: c?.fuseau,
    erreur: c?.erreur,
    enAttente: etats.filter((e) => e === "en-attente").length,
    aRefaire: etats.filter((e) => e === "a-refaire").length,
  };
}

/** État d'un rendez-vous dans Google Agenda (pastille de l'Atelier). */
export const etatRendezVous = (a: Appointment, maintenant = new Date()): EtatSynchro | null => etatSynchro(a, libelle(a), maintenant);

/** Synchronise un rendez-vous (ou tous ceux qui attendent) ; ne lève jamais d'erreur. */
export async function synchroniserGoogle(id?: string): Promise<Bilan> {
  const m = moteur();
  if (!m) return { connecte: false, aReconnecter: false, faits: 0, echecs: 0 };
  try {
    return await m.moteur.synchroniser(id);
  } catch (e) {
    console.error("[google-agenda] synchronisation", e instanceof Error ? e.message : "erreur");
    return { connecte: true, aReconnecter: false, faits: 0, echecs: 1, erreur: "Google Agenda n’a pas répondu comme prévu." };
  }
}

/** Connexion après le retour de Google (route de l'Atelier). */
export async function connecterGoogle(opts: { code: string; verifier: string; par: string }): Promise<ConnexionGoogle> {
  const m = moteur();
  if (!m) throw new Error("Google Agenda n’est pas encore branché.");
  occupe = null;
  return m.moteur.connecter({ ...opts, redirectUri: adresseRetour() });
}

export async function deconnecterGoogle(): Promise<{ revoque: boolean }> {
  occupe = null;
  const m = moteur();
  if (!m) {
    await kv.del(CONNEXION);
    return { revoque: true };
  }
  return m.moteur.deconnecter();
}

// ------------------------------------------------------------------ moments occupés (créneaux)
/**
 * Moments déjà pris dans l'agenda Google sur `jours` jours, pour ne jamais les proposer aux
 * clientes. Liste vide si Google n'est pas connecté ou ne répond pas : la réservation continue.
 */
export async function occupationsGoogle(jours: number): Promise<Plage[]> {
  const m = moteur();
  if (!m) return [];
  const t = Date.now();
  if (occupe && occupe.jusqua > t && occupe.jours >= jours) return occupe.plages;
  const c = await kv.get<ConnexionGoogle>(CONNEXION).catch(() => null);
  if (c?.etat !== "connecte") return [];
  const entree: Cache = { jusqua: t + 5 * 60_000, jours, plages: Promise.resolve([]) };
  entree.plages = m.moteur.occupations(jours + 1).catch((e: unknown): Plage[] => {
    console.error("[google-agenda] moments occupés", e instanceof Error ? e.message : "erreur");
    // un échec n'est gardé qu'une minute : Google est relu bientôt
    entree.jusqua = Date.now() + 60_000;
    return [];
  });
  occupe = entree;
  return entree.plages;
}
