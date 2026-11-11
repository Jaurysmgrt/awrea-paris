/**
 * Stockage des parcours de vente (stockage technique, lib/store) :
 *  - « parcours:liste » : les parcours (définition et statut) ;
 *  - « parcours:reglages » : le plafond de fréquence ;
 *  - « parcours:envois-reels » : l'interrupteur de l'Atelier (seconde clé : PARCOURS_ENVOIS_REELS) ;
 *  - « parcours:etat:simulation » et « parcours:etat:reel » : où en est chaque personne. Les deux
 *    modes sont séparés : une personne suivie en simulation n'a rien reçu, elle repart de zéro le
 *    jour des envois réels ;
 *  - « parcours:journal » : ce qui est parti, ou serait parti (simulation), entrées et sorties ;
 *  - « parcours:passages » : le bilan des derniers passages.
 */
import "server-only";
import { kv } from "@/lib/store";
import { avecVerrou } from "@/lib/store/verrou";
import type { Bilan } from "./moteur";
import { REGLAGES_PAR_DEFAUT, etatVide, type Etat, type Interrupteur, type LigneJournal, type Mode, type Parcours, type Reglages } from "./types";

const LISTE = "parcours:liste";
const REGLAGES = "parcours:reglages";
const INTERRUPTEUR = "parcours:envois-reels";
const JOURNAL = "parcours:journal";
const PASSAGES = "parcours:passages";
const etatKey = (mode: Mode) => `parcours:etat:${mode}`;
export const JOURNAL_MAX = 1000;

export async function listeParcours(): Promise<Parcours[]> {
  return (await kv.get<Parcours[]>(LISTE)) ?? [];
}

export async function unParcours(id: string): Promise<Parcours | null> {
  return (await listeParcours()).find((p) => p.id === id) ?? null;
}

/** Modifie la liste sous verrou : deux enregistrements simultanés ne s'écrasent jamais. */
export async function modifierListe<T>(fn: (liste: Parcours[]) => { liste: Parcours[]; resultat: T }): Promise<T> {
  return avecVerrou("parcours:liste", async () => {
    const { liste, resultat } = fn(await listeParcours());
    await kv.set(LISTE, liste);
    return resultat;
  });
}

export async function lireReglages(): Promise<Reglages> {
  return { ...REGLAGES_PAR_DEFAUT, ...((await kv.get<Partial<Reglages>>(REGLAGES)) ?? {}) };
}
export async function ecrireReglages(r: Reglages) {
  await kv.set(REGLAGES, r);
}

export async function lireInterrupteur(): Promise<Interrupteur> {
  return (await kv.get<Interrupteur>(INTERRUPTEUR)) ?? { actif: false };
}
export async function ecrireInterrupteur(i: Interrupteur) {
  await kv.set(INTERRUPTEUR, i);
}

export async function lireEtat(mode: Mode): Promise<Etat> {
  return { ...etatVide(), ...((await kv.get<Etat>(etatKey(mode))) ?? {}) };
}
export async function ecrireEtat(mode: Mode, etat: Etat) {
  await kv.set(etatKey(mode), etat);
}

/** Oublie un parcours retiré : ses suivis, dans les deux modes (les personnes gardent ce qu'elles ont reçu). */
export async function oublierParcours(id: string) {
  for (const mode of ["simulation", "reel"] as const) {
    const etat = await lireEtat(mode);
    if (!etat.suivis[id]) continue;
    delete etat.suivis[id];
    await ecrireEtat(mode, etat);
  }
}

export async function ajouterAuJournal(lignes: LigneJournal[]) {
  // le plus récent en tête : on pousse dans l'ordre du passage
  for (const l of lignes) await kv.push(JOURNAL, l, JOURNAL_MAX);
}
export async function lireJournal(limite = 300): Promise<LigneJournal[]> {
  return kv.list<LigneJournal>(JOURNAL, limite);
}

export async function noterPassage(b: Bilan) {
  await kv.push(PASSAGES, b, 60);
}
export async function derniersPassages(limite = 10): Promise<Bilan[]> {
  return kv.list<Bilan>(PASSAGES, limite);
}
