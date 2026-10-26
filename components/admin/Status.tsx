import type { ActionStatus } from "@/lib/agents/log";
import { AGENT_NAMES, agentName } from "./agent-names";

const LABELS: Record<ActionStatus | "pending", string> = {
  done: "Fait",
  proposed: "À valider",
  pending: "À valider",
  approved: "Validé",
  rejected: "Refusé",
  failed: "Échec",
  info: "Info",
};

export function Status({ value }: { value: ActionStatus | "pending" }) {
  return <span className={`status status--${value}`}>{LABELS[value]}</span>;
}

/** Nom de l'agent ; `names` : noms complétés côté serveur par les registres (agent-names.ts). */
export function AgentName({ id, names = AGENT_NAMES }: { id: string; names?: Record<string, string> }) {
  return <span className="agent-name">{agentName(id, names)}</span>;
}

export function When({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <time dateTime={iso} className="when">
      {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
    </time>
  );
}
