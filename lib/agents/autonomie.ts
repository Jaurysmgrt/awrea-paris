/**
 * Ce que les agents font seuls, et dans quelles limites (réponses de la créatrice du 02/11 : « les
 * agents font juste un retour, ils ne travaillent pas vraiment ; j'aimerais qu'ils règlent eux-mêmes
 * les problèmes, avec bien sûr des règles »). Elle a choisi quatre autonomies, chacune coupée ou
 * rallumée d'un geste dans l'Atelier › Réglages › Ce que les agents font seuls.
 *
 * Ce qui ne change jamais (lib/agents/policy.ts) : l'argent (remboursement, annulation, prix) et la
 * lettre à toute la liste restent ses décisions ; aucun agent n'a accès aux données bancaires ni aux
 * mots de passe ; un texte qui contient une formulation interdite repasse par elle avant de partir.
 */
import "server-only";
import { kv } from "@/lib/store";

export type Autonomie = "retards" | "corrections" | "avis" | "relances";

export interface AutonomieInfo {
  titre: string;
  /** qui agit */
  agents: string;
  /** la règle, en une phrase, telle qu'elle s'affiche dans les Réglages */
  regle: string;
}

export const AUTONOMIES: Record<Autonomie, AutonomieInfo> = {
  retards: {
    titre: "Prévenir une cliente d’un retard",
    agents: "Commandes et confection",
    regle: "Un seul message par commande et par retard, poli et signé de la Maison. Il ne promet ni geste ni remboursement, et rappelle que la cliente peut répondre.",
  },
  corrections: {
    titre: "Corriger le site",
    agents: "Gardien de l’éditeur",
    regle: "Seulement ce qui ne change pas le sens : espaces, apostrophes et guillemets, et la description d’une photo de pièce reprise du catalogue. Jamais sur une page que vous êtes en train de modifier. Chaque correction est une version de la page, que vous annulez en un clic.",
  },
  avis: {
    titre: "Publier les avis vérifiés",
    agents: "Avis clientes",
    regle: "Un avis d’achat vérifié, sans photo, sans lien ni coordonnées, qui ne signale aucun souci (taille, qualité, retard, colis) est publié seul. Tous les autres vous restent.",
  },
  relances: {
    titre: "Relances et mots d’accueil",
    agents: "Retours, Sur mesure, Cercle",
    regle: "Au plus un e-mail par cliente et par semaine, jamais au sujet d’un remboursement : le rappel d’un retour à déposer, l’accusé d’une demande de sur mesure, le mot de bienvenue du Cercle.",
  },
};

export const LISTE_AUTONOMIES = Object.keys(AUTONOMIES) as Autonomie[];

const REGLAGES_KEY = "agents:autonomie";
const ENVOIS_KEY = "agents:envois";
const SEMAINE = 7 * 86_400_000;

/** Autonomies en vigueur : toutes allumées tant que la créatrice n'en a coupé aucune. */
export async function autonomies(): Promise<Record<Autonomie, boolean>> {
  const saved = (await kv.get<Partial<Record<Autonomie, boolean>>>(REGLAGES_KEY).catch(() => null)) ?? {};
  return Object.fromEntries(LISTE_AUTONOMIES.map((a) => [a, saved[a] ?? true])) as Record<Autonomie, boolean>;
}

export async function permise(a: Autonomie): Promise<boolean> {
  return (await autonomies())[a];
}

export async function regler(a: Autonomie, actif: boolean): Promise<Record<Autonomie, boolean>> {
  const next = { ...(await autonomies()), [a]: actif };
  await kv.set(REGLAGES_KEY, next);
  return next;
}

/**
 * Limite des e-mails partis seuls : une même cliente ne reçoit pas plus d'un e-mail d'agent par
 * semaine (relances et mots d'accueil), et un même sujet (une commande en retard, un retour, une
 * demande) n'est écrit qu'une fois. Renvoie vrai si l'envoi est permis.
 */
export function envoiPermis(envois: Record<string, string>, cliente: string, sujet: string, now: Date): boolean {
  if (envois[`sujet:${sujet}`]) return false;
  const dernier = envois[`cliente:${cliente.toLowerCase()}`];
  return !dernier || now.getTime() - new Date(dernier).getTime() >= SEMAINE;
}

export async function envoisFaits(): Promise<Record<string, string>> {
  return (await kv.get<Record<string, string>>(ENVOIS_KEY).catch(() => null)) ?? {};
}

export async function noterEnvoi(cliente: string, sujet: string, now = new Date()) {
  const envois = await envoisFaits();
  envois[`sujet:${sujet}`] = now.toISOString();
  envois[`cliente:${cliente.toLowerCase()}`] = now.toISOString();
  await kv.set(ENVOIS_KEY, envois);
}

/** Mots qui signalent un souci dans un avis : il revient à la créatrice. */
const SOUCI = /\b(d[ée]çue?s?|d[ée]cevant|retard|ab[iî]m[ée]|cass[ée]|d[ée]faut|d[ée]chir|rembours|arnaque|nul(le)?|horrible|pas re[çc]u|jamais re[çc]u|probl[èe]me|mauvaise?|m[ée]diocre|trop (petite?|grande?|serr[ée]e?|large)|ne (taille|tombe) pas|colis|livraison)\b/i;
const CONTACT = /(https?:\/\/|www\.|@|\+?\d[\d .-]{7,})/i;

/** L'avis peut-il être publié sans la créatrice ? */
export function avisPublicable(r: { body: string; photos?: string[]; fit?: string | null }): boolean {
  if (r.photos?.length) return false;
  if (r.fit && r.fit !== "juste") return false;
  const texte = r.body.trim();
  if (texte.length < 12) return false;
  return !SOUCI.test(texte) && !CONTACT.test(texte);
}
