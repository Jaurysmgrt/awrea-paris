import { POLICY } from "@/lib/agents/policy";
import type { Proposal } from "@/lib/agents/perform";
import { AGENTS } from "@/lib/agents/registry";
import { ROLES } from "@/lib/agents/roles";
import { withRegistryNames } from "./agent-names";
import { formatPrice } from "@/lib/format";
import { ActionButton } from "./ActionButton";
import { AgentName, Status, When } from "./Status";
import { atelierApi } from "@/lib/admin/path";

/** Lecture humaine des paramètres d'une proposition. */
function describe(p: Proposal): string[] {
  const params = p.params as Record<string, unknown>;
  switch (p.action) {
    case "change_price":
      return [`Pièce : ${params.handle}`, `Nouveau prix : ${formatPrice(Number(params.price))}`];
    case "refund_order":
      return [`Commande : ${params.orderId}`, `Motif : ${params.reason}`];
    case "cancel_order":
      return [`Commande : ${params.orderId}`, params.refund ? "Avec remboursement" : "Sans remboursement"];
    case "delete_product":
      return [`Pièce : ${params.handle}`, "La suppression est définitive."];
    case "send_client_message":
      return [`Commande : ${params.orderId}`, `Objet : ${params.subject}`, ...String(params.body ?? "").split(/\n{2,}/)];
    case "confirm_piece_terms":
      return [`Pièce : ${params.handle}`, ...(params.price ? ["Prix confirmé tel quel"] : []), ...(params.leadTime ? ["Délai confirmé tel quel"] : [])];
    case "send_newsletter_all":
      return [`Objet : ${params.subject}`, `Aperçu : ${params.preheader}`, ...((params.paragraphs as string[]) ?? []).slice(0, 4)];
    default:
      return [JSON.stringify(params).slice(0, 300)];
  }
}

/** Confirmation demandée avant de valider une action irréversible. */
const CONFIRM: Partial<Record<Proposal["action"], string>> = {
  delete_product: "Cette action est irréversible. Confirmer ?",
  send_newsletter_all: "Cette action est irréversible. Confirmer ?",
  send_client_message: "Ce message part à la cliente. Confirmer ?",
};

/** Noms des agents et des rôles quotidiens qui peuvent proposer une action. */
const NAMES = withRegistryNames([...AGENTS, ...ROLES]);

export function ProposalCard({ p }: { p: Proposal }) {
  return (
    <article className="proposal" data-status={p.status}>
      <header className="proposal__head">
        <Status value={p.status === "pending" ? "pending" : p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "failed"} />
        <span className="t-label t-soft">
          <AgentName id={p.agent} names={NAMES} /> · <When iso={p.date} /> · {POLICY[p.action]?.why}
        </span>
      </header>
      <h3 className="t-h4">{p.summary}</h3>
      {p.rationale ? <p className="t-note">{p.rationale}</p> : null}
      <ul className="proposal__details">
        {describe(p).map((d, i) => (
          <li key={i} className="t-body">
            {d}
          </li>
        ))}
      </ul>
      {p.status === "pending" ? (
        <div className="proposal__actions">
          <ActionButton endpoint={atelierApi(`/proposals/${p.id}`)} body={{ decision: "approve" }} label="Valider" busyLabel="Exécution…" confirm={CONFIRM[p.action]} />
          <ActionButton endpoint={atelierApi(`/proposals/${p.id}`)} body={{ decision: "reject" }} label="Refuser" variant="outline" />
        </div>
      ) : p.result ? (
        <p className="t-note">{p.result}</p>
      ) : null}
    </article>
  );
}
