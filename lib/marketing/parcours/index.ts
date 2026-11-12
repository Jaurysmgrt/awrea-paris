/**
 * Parcours de vente, côté serveur : le passage quotidien (tâche planifiée /api/cron/flows, ou bouton
 * « Lancer un passage » de l'Atelier), la prévision des prochains jours et les statistiques.
 *
 * Simulation obligatoire : rien ne part tant que deux clés ne sont pas réunies, la variable
 * PARCOURS_ENVOIS_REELS=1 posée dans Vercel par la Maison, et l'interrupteur de l'Atelier confirmé
 * par la créatrice (moteur.ts, modeDesEnvois). Sans elles, le passage écrit dans le journal ce qu'il
 * aurait envoyé, à qui et quel jour. La clé est revérifiée au moment de chaque envoi.
 */
import "server-only";
import { prendreVerrou, rendreVerrou } from "@/lib/store/verrou";
import { avancer, modeDesEnvois, passage, prevoir, statistiques, type Bilan, type Envoi, type Ports, type Statistiques } from "./moteur";
import { lireContacts } from "./contacts";
import { envoyerEmailParcours, etatsEmails } from "./emails";
import { ajouterAuJournal, ecrireEtat, lireEtat, lireInterrupteur, lireReglages, listeParcours, noterPassage } from "./stockage";
import type { Contact, Mode, Parcours } from "./types";

/** La variable posée dans Vercel par la Maison (première clé). */
export const variableEnvoisReels = () => process.env.PARCOURS_ENVOIS_REELS?.trim() === "1";

export async function modeActuel(): Promise<Mode> {
  return modeDesEnvois(process.env.PARCOURS_ENVOIS_REELS, await lireInterrupteur());
}

const ports: Ports = {
  async verrou() {
    // la tâche planifiée peut durer cinq minutes : le verrou expire seul au-delà
    const jeton = await prendreVerrou("parcours:passage", 290_000);
    return jeton ? () => rendreVerrou("parcours:passage", jeton) : null;
  },
  mode: modeActuel,
  parcours: listeParcours,
  reglages: lireReglages,
  contacts: lireContacts,
  emails: etatsEmails,
  lireEtat,
  ecrireEtat,
  async envoyer(v: Envoi) {
    // seconde vérification, au moment même de l'envoi
    if ((await modeActuel()) !== "reel") throw new Error("Envois réels coupés : rien n’est parti.");
    await envoyerEmailParcours(v.emailId, v.email, v.prenom);
  },
  journal: ajouterAuJournal,
};

/** Un passage : entrées, étapes prêtes, sorties ; e-mails envoyés ou simulés. Rejoué, il n'envoie rien en double. */
export async function runParcours(maintenant = new Date()): Promise<Bilan> {
  const bilan = await passage(ports, maintenant);
  if (!bilan.occupe) await noterPassage(bilan);
  return bilan;
}

/** Ce qui partirait dans les prochains jours (simulation sur une copie de l'état, rien n'est enregistré). */
export async function prevision(jours = 30) {
  const [mode, parcours, reglages, contacts, emails] = await Promise.all([modeActuel(), listeParcours(), lireReglages(), lireContacts(), etatsEmails()]);
  if (!parcours.some((p) => p.statut === "actif")) return [];
  const etat = await lireEtat(mode);
  return prevoir({ parcours, contacts, etat, reglages, emails, maintenant: new Date(), mode }, jours);
}

/** Ce qu'un passage ferait maintenant pour un seul parcours (sans rien enregistrer) : utile avant de l'activer. */
export async function apercuEntrees(p: Parcours, contacts?: Contact[]): Promise<number> {
  const [reglages, emails, liste] = await Promise.all([lireReglages(), etatsEmails(), listeParcours()]);
  const etat = await lireEtat(await modeActuel());
  const r = avancer({ parcours: [...liste.filter((x) => x.id !== p.id), { ...p, statut: "actif" }], contacts: contacts ?? (await lireContacts()), etat, reglages, emails, maintenant: new Date(), mode: "simulation" });
  return r.journal.filter((l) => l.parcours === p.id && l.evenement === "entree").length;
}

/** Statistiques d'un parcours dans les deux modes. Clics et ouvertures : aucun outil de mesure n'est branché. */
export async function statsParcours(p: Pick<Parcours, "id">, contacts: Contact[]): Promise<Record<Mode, Statistiques>> {
  const [simulation, reel] = await Promise.all([lireEtat("simulation"), lireEtat("reel")]);
  return { simulation: statistiques(p, simulation, contacts), reel: statistiques(p, reel, contacts) };
}
