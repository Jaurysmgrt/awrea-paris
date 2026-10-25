/**
 * Identifiants des agents : module pur (sans stockage), partagé par le journal, le registre, le
 * tableau de bord et les tests unitaires.
 */
import type { AgentId } from "./log";

/**
 * Identifiants retirés, encore présents dans les journaux enregistrés : l'agent « Commandes et
 * stock » est devenu « Commandes et confection » avec le modèle « sur demande ».
 */
export const LEGACY_AGENT_IDS: Record<string, AgentId> = { "commandes-stock": "commandes-confection" };

/** Identifiant actuel d'un agent, y compris pour une entrée ancienne du journal. */
export const currentAgentId = (id: string): string => LEGACY_AGENT_IDS[id] ?? id;
