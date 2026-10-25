/**
 * Journal des actions des agents — toutes les actions (autonomes ou proposées) y sont tracées
 * et consultables dans le tableau de bord Atelier.
 */
import { kv } from "@/lib/store";
import type { RoleId } from "./roles/types";

/** agents de l'équipe d'origine, rôles de gestion quotidienne (lib/agents/roles) et actions du système */
export type AgentId = "catalogue" | "service-client" | "commandes-confection" | "seo" | "contenu" | "rapport" | "systeme" | RoleId;

/**
 * Identifiants retirés, encore présents dans les journaux enregistrés : l'agent « Commandes et
 * stock » est devenu « Commandes et confection » avec le modèle « sur demande ».
 */
export const LEGACY_AGENT_IDS: Record<string, AgentId> = { "commandes-stock": "commandes-confection" };

/** Identifiant actuel d'un agent, y compris pour une entrée ancienne du journal. */
export const currentAgentId = (id: string): string => LEGACY_AGENT_IDS[id] ?? id;

export type ActionStatus = "done" | "proposed" | "approved" | "rejected" | "failed" | "info";

export interface AgentAction {
  id: string;
  date: string;
  agent: AgentId;
  kind: string;
  summary: string;
  detail?: string;
  status: ActionStatus;
  target?: { type: string; id: string; label?: string; href?: string };
  proposalId?: string;
}

export const LOG_KEY = "agents:log";

export async function logAction(a: Omit<AgentAction, "id" | "date">): Promise<AgentAction> {
  const action: AgentAction = { id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, date: new Date().toISOString(), ...a };
  await kv.push(LOG_KEY, action, 2000);
  return action;
}

export async function getLog(limit = 200): Promise<AgentAction[]> {
  return kv.list<AgentAction>(LOG_KEY, limit);
}
