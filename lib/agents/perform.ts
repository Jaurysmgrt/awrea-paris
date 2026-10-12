/**
 * Point de passage unique de toutes les actions des agents :
 * - action autonome → exécutée immédiatement et journalisée ;
 * - action sensible (argent, irréversible) → proposition à valider dans le tableau de bord.
 */
import { kv } from "@/lib/store";
import { ACTION_SCHEMAS, EXECUTORS, type ActionParams, type ActionResult } from "./actions";
import { POLICY, requiresApproval, type ActionType } from "./policy";
import { logAction, type AgentId } from "./log";

export interface Proposal<T extends ActionType = ActionType> {
  id: string;
  date: string;
  agent: AgentId;
  action: T;
  params: ActionParams<T>;
  summary: string;
  rationale: string;
  status: "pending" | "approved" | "rejected" | "failed";
  decidedAt?: string;
  result?: string;
}

export const PROPOSALS_KEY = "agents:proposals";

export async function getProposals(): Promise<Proposal[]> {
  return (await kv.get<Proposal[]>(PROPOSALS_KEY)) ?? [];
}

async function saveProposals(list: Proposal[]) {
  await kv.set(PROPOSALS_KEY, list.slice(0, 300));
}

export interface PerformOutcome {
  status: "done" | "proposed" | "failed";
  message: string;
  proposalId?: string;
}

export async function perform<T extends ActionType>(agent: AgentId, action: T, rawParams: unknown, meta: { summary: string; rationale?: string }): Promise<PerformOutcome> {
  const parsed = ACTION_SCHEMAS[action].safeParse(rawParams);
  if (!parsed.success) {
    const message = `Paramètres invalides pour « ${POLICY[action].label} » : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(" ; ")}`;
    await logAction({ agent, kind: action, status: "failed", summary: meta.summary, detail: message });
    return { status: "failed", message };
  }
  const params = parsed.data as ActionParams<T>;

  if (requiresApproval(action)) {
    const list = await getProposals();
    const duplicate = list.find((p) => p.status === "pending" && p.action === action && JSON.stringify(p.params) === JSON.stringify(params));
    if (duplicate) return { status: "proposed", message: "Une proposition identique attend déjà la validation de la créatrice.", proposalId: duplicate.id };
    const proposal: Proposal<T> = {
      id: `prop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      date: new Date().toISOString(),
      agent,
      action,
      params,
      summary: meta.summary,
      rationale: meta.rationale ?? "",
      status: "pending",
    };
    await saveProposals([proposal as Proposal, ...list]);
    await logAction({ agent, kind: action, status: "proposed", summary: meta.summary, detail: meta.rationale, proposalId: proposal.id });
    return { status: "proposed", message: `Proposition enregistrée : elle attend la validation de la créatrice dans le tableau de bord (${POLICY[action].why}).`, proposalId: proposal.id };
  }

  try {
    const executor = EXECUTORS[action] as unknown as (p: ActionParams<T>) => Promise<ActionResult>;
    const result = await executor(params);
    await logAction({ agent, kind: action, status: "done", summary: result.summary, detail: meta.rationale, target: result.target });
    return { status: "done", message: result.summary };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logAction({ agent, kind: action, status: "failed", summary: meta.summary, detail: message });
    return { status: "failed", message };
  }
}

/** Décision de la créatrice sur une proposition (un clic dans le tableau de bord). */
export async function decide(id: string, decision: "approve" | "reject"): Promise<Proposal> {
  const list = await getProposals();
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error("Proposition introuvable");
  if (p.status !== "pending") throw new Error("Cette proposition a déjà été traitée.");
  p.decidedAt = new Date().toISOString();
  if (decision === "reject") {
    p.status = "rejected";
    await logAction({ agent: p.agent, kind: p.action, status: "rejected", summary: `Refusé par la créatrice : ${p.summary}`, proposalId: p.id });
  } else {
    try {
      const executor = EXECUTORS[p.action] as unknown as (params: unknown) => Promise<ActionResult>;
      const result = await executor(p.params);
      p.status = "approved";
      p.result = result.summary;
      await logAction({ agent: p.agent, kind: p.action, status: "approved", summary: `Validé par la créatrice : ${result.summary}`, target: result.target, proposalId: p.id });
    } catch (e) {
      p.status = "failed";
      p.result = e instanceof Error ? e.message : String(e);
      await logAction({ agent: p.agent, kind: p.action, status: "failed", summary: `Échec après validation : ${p.summary}`, detail: p.result, proposalId: p.id });
    }
  }
  await saveProposals(list);
  return p;
}
