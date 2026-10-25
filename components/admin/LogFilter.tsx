"use client";
import { useMemo, useState } from "react";
import type { AgentAction } from "@/lib/agents/log";
import { AGENT_NAMES, agentName } from "./agent-names";
import { LogList } from "./LogList";

/** Agents toujours proposés dans le filtre, dans cet ordre ; ceux du journal suivent, puis l'Atelier. */
const MAIN = ["catalogue", "service-client", "commandes-confection", "seo", "contenu", "rapport"];

/**
 * Journal filtrable. Le filtre porte sur le nom affiché : un ancien identifiant et le nouveau
 * (« commandes-stock », « commandes-confection ») se retrouvent sous le même nom.
 */
export function LogFilter({ items, names = AGENT_NAMES }: { items: AgentAction[]; names?: Record<string, string> }) {
  const [agent, setAgent] = useState("tous");
  const [status, setStatus] = useState("tous");
  const [q, setQ] = useState("");
  const agents = useMemo(() => {
    const main = MAIN.map((id) => agentName(id, names));
    const atelier = agentName("systeme", names);
    const others = [...new Set(items.map((a) => agentName(a.agent, names)))].filter((n) => !main.includes(n) && n !== atelier).sort((a, b) => a.localeCompare(b, "fr"));
    return [...new Set([...main, ...others, atelier])];
  }, [items, names]);
  const list = useMemo(
    () => items.filter((a) => (agent === "tous" || agentName(a.agent, names) === agent) && (status === "tous" || a.status === status) && (!q || `${a.summary} ${a.detail ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [items, names, agent, status, q],
  );
  return (
    <div className="stack-m">
      <div className="form__row form__row--3">
        <div className="field">
          <label className="field__label" htmlFor="f-agent">Agent</label>
          <select id="f-agent" className="field__input" value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="tous">Tous</option>
            {agents.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="f-status">Statut</label>
          <select id="f-status" className="field__input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="tous">Tous</option>
            <option value="done">Fait</option>
            <option value="proposed">À valider</option>
            <option value="approved">Validé</option>
            <option value="rejected">Refusé</option>
            <option value="failed">Échec</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="f-q">Recherche</label>
          <input id="f-q" className="field__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Odessa, AW-1036…" />
        </div>
      </div>
      <p className="t-label t-soft">{list.length} action(s)</p>
      <LogList items={list} names={names} />
    </div>
  );
}
