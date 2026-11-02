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
import { LISTE_AUTONOMIES, type Autonomie } from "./autonomie-regles";

export * from "./autonomie-regles";

const REGLAGES_KEY = "agents:autonomie";
const ENVOIS_KEY = "agents:envois";
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

export async function envoisFaits(): Promise<Record<string, string>> {
  return (await kv.get<Record<string, string>>(ENVOIS_KEY).catch(() => null)) ?? {};
}

export async function noterEnvoi(cliente: string, sujet: string, now = new Date()) {
  const envois = await envoisFaits();
  envois[`sujet:${sujet}`] = now.toISOString();
  envois[`cliente:${cliente.toLowerCase()}`] = now.toISOString();
  await kv.set(ENVOIS_KEY, envois);
}
