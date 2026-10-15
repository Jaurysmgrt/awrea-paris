/**
 * Contrôle : le critique indépendant de chaque rôle. Il relit le passage avant qu'il n'arrive
 * dans l'Atelier : une proposition sans raison, un doublon de proposition en attente, une alerte
 * urgente sans endroit où agir, une avalanche d'alertes, une action sensible qui n'aurait pas été
 * soumise à la créatrice. Il ne fait rien lui-même : il signale.
 */
import type { Proposal } from "@/lib/agents/perform";
import type { AgentAction } from "@/lib/agents/log";
import { POLICY } from "@/lib/agents/policy";
import type { Finding, RoleOutcome } from "./types";

export function controle(outcome: RoleOutcome, ctx: { since: string; role: string; proposals: Proposal[]; log: AgentAction[] }): Finding[] {
  const out: Finding[] = [];
  const mine = ctx.proposals.filter((p) => p.agent === ctx.role && p.date >= ctx.since);
  for (const p of mine) {
    if ((p.rationale ?? "").trim().length < 20) out.push({ gravite: "attention", titre: "Proposition sans raison claire", detail: p.summary, lien: "/validations", cible: p.id });
    const twin = ctx.proposals.find((q) => q.id !== p.id && q.status === "pending" && q.action === p.action && JSON.stringify(q.params) === JSON.stringify(p.params));
    if (twin) out.push({ gravite: "attention", titre: "Proposition en double", detail: `${p.summary} attend déjà votre décision.`, lien: "/validations", cible: p.id });
  }
  const acted = ctx.log.filter((a) => a.agent === ctx.role && a.date >= ctx.since);
  for (const a of acted) {
    if (a.status === "done" && SENSITIVE.has(a.kind)) out.push({ gravite: "urgent", titre: "Action sensible faite sans votre accord", detail: a.summary, lien: "/journal", cible: a.id });
  }
  if (acted.filter((a) => a.kind === "alert_atelier").length > 5) out.push({ gravite: "attention", titre: "Trop d’alertes en un seul passage", detail: "Le rôle doit regrouper ses alertes : l’essentiel se perd sinon." });
  for (const f of outcome.findings) if (f.gravite === "urgent" && !f.lien) out.push({ gravite: "attention", titre: "Alerte urgente sans endroit où agir", detail: f.titre });
  return out;
}

/** actions qui touchent à l'argent ou ne se défont pas (lib/agents/policy.ts) */
const SENSITIVE = new Set(Object.entries(POLICY).filter(([, p]) => p.approval).map(([k]) => k));
