/**
 * Point de passage unique de toutes les actions des agents :
 * - action autonome → exécutée immédiatement et journalisée ;
 * - action sensible (argent, irréversible) → proposition à valider dans le tableau de bord ;
 * - action d'une autonomie que la créatrice a coupée (Réglages › Ce que les agents font seuls) →
 *   proposition, elle aussi (lib/agents/autonomie.ts).
 */
import { kv } from "@/lib/store";
import { ACTION_SCHEMAS, EXECUTORS, type ActionParams, type ActionResult } from "./actions";
import { AUTONOMIE_DE, isActionType, POLICY, requiresApproval, type ActionType } from "./policy";
import { AUTONOMIES, permise } from "./autonomie";
import { logAction, type AgentId } from "./log";
import { cleanTexts } from "@/lib/writing/agents";
import { reportWriting } from "@/lib/writing/report";
import { safeOutbound } from "@/lib/ai/guard";

/** Actions qui mettent un texte sous les yeux des clientes sans relecture humaine. */
const PUBLISHES_TEXT = new Set<ActionType>(["publish_product", "update_product_content", "send_reply", "publish_article", "update_ai_visibility"]);
/** Actions qui écrivent seules à une cliente, avec un texte rédigé par un agent. */
const WRITES_TO_CLIENT = new Set<ActionType>(["send_reply"]);

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

/**
 * Propositions enregistrées. Celles d'une action retirée (stock, liste d'attente, avant le modèle
 * « sur demande ») ne peuvent plus être exécutées ni décrites : elles sont écartées.
 */
export async function getProposals(): Promise<Proposal[]> {
  return ((await kv.get<Proposal[]>(PROPOSALS_KEY)) ?? []).filter((p) => isActionType(p.action));
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
  meta = { ...meta };
  const parsed = ACTION_SCHEMAS[action].safeParse(rawParams);
  if (!parsed.success) {
    const message = `Paramètres invalides pour « ${POLICY[action].label} » : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(" ; ")}`;
    await logAction({ agent, kind: action, status: "failed", summary: meta.summary, detail: message });
    return { status: "failed", message };
  }
  // écriture de la créatrice : typographie et tirets corrigés, formulations interdites signalées
  const cleaned = cleanTexts(parsed.data);
  const params = cleaned.value as ActionParams<T>;
  const writing = cleaned.issues;
  if (writing.length) await reportWriting(`agent:${agent}`, writing, meta.summary).catch(() => {});
  // une formulation interdite dans un texte qui part en ligne : la créatrice relit d'abord
  const mustReview = writing.length > 0 && PUBLISHES_TEXT.has(action);
  if (mustReview) {
    const notes = writing.map((w) => `${w.message} (${w.path})`).join(" ; ");
    meta = { ...meta, rationale: `Texte à relire avant publication : ${notes}${meta.rationale ? `. ${meta.rationale}` : ""}` };
  }

  // une réponse qui part seule ne cite que le site et les transporteurs, quel que soit l'agent qui
  // l'a écrite (assistant compris) : une autre adresse, un autre lien ou un numéro, et elle attend
  const outbound = params as { subject?: string; body?: string };
  const horsMaison = WRITES_TO_CLIENT.has(action) && !safeOutbound(`${outbound.subject ?? ""}\n${outbound.body ?? ""}`);
  if (horsMaison) meta = { ...meta, rationale: `Le texte cite une adresse, un lien ou un numéro qui n’est pas celui de la Maison : à relire avant l’envoi.${meta.rationale ? ` ${meta.rationale}` : ""}` };

  // autonomie coupée dans les Réglages : l'action attend la créatrice
  const autonomie = AUTONOMIE_DE[action];
  const coupee = autonomie ? !(await permise(autonomie)) : false;

  if (requiresApproval(action) || mustReview || coupee || horsMaison) {
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
      rationale: coupee && autonomie ? `${meta.rationale ? `${meta.rationale} ` : ""}Vous avez coupé « ${AUTONOMIES[autonomie].titre} » dans les Réglages : l’agent vous laisse décider.` : (meta.rationale ?? ""),
      status: "pending",
    };
    await saveProposals([proposal as Proposal, ...list]);
    await logAction({ agent, kind: action, status: "proposed", summary: meta.summary, detail: meta.rationale, proposalId: proposal.id });
    return { status: "proposed", message: `Proposition enregistrée : elle attend la validation de la créatrice dans le tableau de bord (${POLICY[action].why ?? (coupee && autonomie ? `« ${AUTONOMIES[autonomie].titre} » est coupé dans les Réglages` : "texte à relire")})`, proposalId: proposal.id };
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

/**
 * Décision de la créatrice sur une proposition (un clic dans le tableau de bord). Une seule décision
 * par proposition, même avec deux clics ou deux onglets : la proposition est réservée (verrou du stockage, 10 minutes) avant d'exécuter quoi que
 * ce soit, puis la liste est relue au moment d'enregistrer, pour ne rien écraser de ce qui a changé
 * pendant l'exécution (un remboursement ou une lettre ne partent jamais deux fois).
 */
export async function decide(id: string, decision: "approve" | "reject"): Promise<Proposal> {
  const first = (await getProposals()).find((x) => x.id === id);
  if (!first) throw new Error("Proposition introuvable");
  if (first.status !== "pending") throw new Error("Cette proposition a déjà été traitée.");
  if ((await kv.incr(`agents:proposals:decision:${id}`, 600)) !== 1) throw new Error("Cette proposition est déjà en cours de traitement.");
  const p: Proposal = { ...first, decidedAt: new Date().toISOString() };
  if (decision === "reject") {
    p.status = "rejected";
    await logAction({ agent: p.agent, kind: p.action, status: "rejected", summary: `Refusé par la créatrice : ${p.summary}`, proposalId: p.id });
  } else {
    try {
      const executor = EXECUTORS[p.action] as unknown as (params: unknown) => Promise<ActionResult>;
      const result = await executor(p.params);
      p.status = "approved";
      p.result = result.summary;
      await logAction({ agent: p.agent, kind: p.action, status: "approved", summary: `Validé par la créatrice : ${result.summary}`, target: result.target, proposalId: p.id });
    } catch (e) {
      p.status = "failed";
      p.result = e instanceof Error ? e.message : String(e);
      await logAction({ agent: p.agent, kind: p.action, status: "failed", summary: `Échec après validation : ${p.summary}`, detail: p.result, proposalId: p.id });
    }
  }
  const list = await getProposals();
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  await saveProposals(list);
  return p;
}
