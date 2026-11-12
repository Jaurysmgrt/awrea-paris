/**
 * Gestes de l'Atelier sur les parcours (routes app/api/gestion/parcours) : créer depuis un modèle,
 * enregistrer, activer, mettre en pause, retirer. Un parcours se modifie seulement en brouillon ou
 * en pause : jamais pendant que des personnes avancent dedans.
 */
import "server-only";
import { modele } from "./modeles";
import { emailsDesParcours } from "./emails";
import { modifierListe, oublierParcours, unParcours } from "./stockage";
import { nouvelId, RefusParcours, type Definition, type Parcours } from "./types";

export { RefusParcours };

/** Les e-mails cités existent et servent dans un parcours (e-mails de la lettre). */
async function verifierEmails(d: Pick<Definition, "etapes">) {
  const permis = new Set((await emailsDesParcours()).map((e) => e.id));
  const inconnu = d.etapes.find((e) => e.type === "email" && !permis.has(e.email));
  if (inconnu) throw new RefusParcours("Un e-mail choisi n’existe plus. Choisissez-en un autre.");
  if (new Set(d.etapes.map((e) => e.id)).size !== d.etapes.length) throw new RefusParcours("Deux étapes portent le même repère. Rechargez la page.");
}

export async function creerDepuisModele(m: string, by: string): Promise<Parcours> {
  const mod = modele(m);
  if (!mod) throw new RefusParcours("Ce modèle n’existe pas.");
  const now = new Date().toISOString();
  const p: Parcours = { id: nouvelId("p"), modele: mod.id, statut: "brouillon", ...mod.definition(), creeLe: now, creePar: by, modifieLe: now, modifiePar: by };
  return modifierListe((liste) => ({ liste: [...liste, p], resultat: p }));
}

export async function enregistrer(id: string, d: Definition, by: string): Promise<Parcours> {
  await verifierEmails(d);
  return modifierListe((liste) => {
    const p = liste.find((x) => x.id === id);
    if (!p) throw new RefusParcours("Ce parcours n’existe plus.");
    if (p.statut === "actif") throw new RefusParcours("Mettez le parcours en pause pour le modifier.");
    const suivant: Parcours = { ...p, ...d, modifieLe: new Date().toISOString(), modifiePar: by };
    return { liste: liste.map((x) => (x.id === id ? suivant : x)), resultat: suivant };
  });
}

export async function changerStatut(id: string, statut: "actif" | "pause", by: string): Promise<Parcours> {
  const actuel = await unParcours(id);
  if (!actuel) throw new RefusParcours("Ce parcours n’existe plus.");
  if (statut === "actif") {
    if (!actuel.etapes.some((e) => e.type === "email")) throw new RefusParcours("Ajoutez au moins un e-mail avant d’activer le parcours.");
    await verifierEmails(actuel);
  }
  return modifierListe((liste) => {
    const p = liste.find((x) => x.id === id);
    if (!p) throw new RefusParcours("Ce parcours n’existe plus.");
    if (statut === "pause" && p.statut !== "actif") throw new RefusParcours("Ce parcours n’est pas actif.");
    const now = new Date().toISOString();
    const suivant: Parcours = { ...p, statut, modifieLe: now, modifiePar: by, ...(statut === "actif" ? { activeLe: now } : {}) };
    return { liste: liste.map((x) => (x.id === id ? suivant : x)), resultat: suivant };
  });
}

/** Retire un parcours (brouillon ou en pause) et oublie ses suivis. */
export async function retirer(id: string): Promise<void> {
  await modifierListe((liste) => {
    const p = liste.find((x) => x.id === id);
    if (!p) throw new RefusParcours("Ce parcours n’existe plus.");
    if (p.statut === "actif") throw new RefusParcours("Mettez le parcours en pause avant de le retirer.");
    return { liste: liste.filter((x) => x.id !== id), resultat: null };
  });
  await oublierParcours(id);
}
