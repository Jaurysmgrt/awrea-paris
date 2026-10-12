/** Suivi des passages des agents (dernier passage, bilan, erreurs) pour le tableau de bord. */
import { kv } from "@/lib/store";
import { aiEnabled } from "@/lib/ai/client";
import { logAction, type AgentId } from "./log";
import { perform, type PerformOutcome } from "./perform";
import type { ActionType } from "./policy";

export interface AgentRun {
  id: string;
  agent: AgentId;
  startedAt: string;
  finishedAt?: string;
  mode: "claude" | "demo";
  trigger: "cron" | "manuel" | "evenement";
  summary: string;
  done: number;
  proposed: number;
  failed: number;
  errors: string[];
}

export const RUNS_KEY = "agents:runs";

export class RunRecorder {
  run: AgentRun;
  constructor(agent: AgentId, trigger: AgentRun["trigger"]) {
    this.run = {
      id: `run-${Date.now().toString(36)}`,
      agent,
      startedAt: new Date().toISOString(),
      mode: aiEnabled ? "claude" : "demo",
      trigger,
      summary: "",
      done: 0,
      proposed: 0,
      failed: 0,
      errors: [],
    };
  }
  async act(action: ActionType, params: unknown, meta: { summary: string; rationale?: string }): Promise<PerformOutcome> {
    const r = await perform(this.run.agent, action, params, meta);
    if (r.status === "done") this.run.done++;
    else if (r.status === "proposed") this.run.proposed++;
    else {
      this.run.failed++;
      this.run.errors.push(r.message);
    }
    return r;
  }
  error(e: unknown) {
    this.run.failed++;
    this.run.errors.push(e instanceof Error ? e.message : String(e));
  }
  async finish(summary: string): Promise<AgentRun> {
    this.run.finishedAt = new Date().toISOString();
    this.run.summary = summary;
    await kv.push(RUNS_KEY, this.run, 500);
    await logAction({
      agent: this.run.agent,
      kind: "passage",
      status: "info",
      summary: `Passage terminé (${this.run.mode === "claude" ? "Claude" : "démonstration"}) — ${summary}`,
      detail: this.run.errors.length ? this.run.errors.join("\n") : undefined,
    });
    return this.run;
  }
}

export async function getRuns(limit = 100): Promise<AgentRun[]> {
  return kv.list<AgentRun>(RUNS_KEY, limit);
}
