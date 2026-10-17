/**
 * Signalements d'écriture : textes des agents, de l'assistante ou de l'éditeur qui contiennent encore
 * une formulation interdite après nettoyage. Lus par l'Atelier et par la maintenance de nuit.
 */
import "server-only";
import { kv } from "@/lib/store";
import type { FieldIssue } from "@/lib/writing/agents";

export interface WritingReport {
  id: string;
  date: string;
  /** « agent:catalogue », « assistante », « editeur » … */
  source: string;
  context?: string;
  issues: { path: string; rule: string; message: string; excerpt: string; suggestion?: string }[];
}

export const WRITING_REPORTS_KEY = "ecriture:signalements";

export async function reportWriting(source: string, issues: FieldIssue[], context?: string) {
  if (!issues.length) return;
  const entry: WritingReport = {
    id: `ec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    source,
    context,
    issues: issues.map(({ path, rule, message, excerpt, suggestion }) => ({ path, rule, message, excerpt, suggestion })),
  };
  const list = (await kv.get<WritingReport[]>(WRITING_REPORTS_KEY)) ?? [];
  await kv.set(WRITING_REPORTS_KEY, [entry, ...list].slice(0, 300));
}

export async function listWritingReports(since?: Date): Promise<WritingReport[]> {
  const list = (await kv.get<WritingReport[]>(WRITING_REPORTS_KEY)) ?? [];
  return since ? list.filter((r) => new Date(r.date) >= since) : list;
}
