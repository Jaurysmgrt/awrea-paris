import type { ActionStatus } from "@/lib/agents/log";

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

export function AgentName({ id }: { id: string }) {
  const names: Record<string, string> = {
    catalogue: "Catalogue",
    "service-client": "Service client",
    "commandes-stock": "Commandes et stock",
    seo: "SEO et visibilité IA",
    contenu: "Contenu",
    rapport: "Rapport",
    systeme: "Atelier",
  };
  return <span className="agent-name">{names[id] ?? id}</span>;
}

export function When({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <time dateTime={iso} className="when">
      {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
    </time>
  );
}
