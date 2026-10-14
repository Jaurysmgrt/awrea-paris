import { POLICY } from "@/lib/agents/policy";
import type { Proposal } from "@/lib/agents/perform";
import { formatPrice } from "@/lib/format";
import { ActionButton } from "./ActionButton";
import { AgentName, Status, When } from "./Status";

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
    case "send_newsletter_all":
      return [`Objet : ${params.subject}`, `Aperçu : ${params.preheader}`, ...((params.paragraphs as string[]) ?? []).slice(0, 4)];
    default:
      return [JSON.stringify(params).slice(0, 300)];
  }
}

export function ProposalCard({ p }: { p: Proposal }) {
  return (
    <article className="proposal" data-status={p.status}>
      <header className="proposal__head">
        <Status value={p.status === "pending" ? "pending" : p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "failed"} />
        <span className="t-label t-soft">
          <AgentName id={p.agent} /> · <When iso={p.date} /> · {POLICY[p.action].why}
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
          <ActionButton endpoint={`/api/gestion/proposals/${p.id}`} body={{ decision: "approve" }} label="Valider" busyLabel="Exécution…" variant="solid" confirm={p.action === "delete_product" || p.action === "send_newsletter_all" ? "Cette action est irréversible. Confirmer ?" : undefined} />
          <ActionButton endpoint={`/api/gestion/proposals/${p.id}`} body={{ decision: "reject" }} label="Refuser" />
        </div>
      ) : p.result ? (
        <p className="t-note">{p.result}</p>
      ) : null}
    </article>
  );
}
