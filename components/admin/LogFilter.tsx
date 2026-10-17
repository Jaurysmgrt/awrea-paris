"use client";
import { useMemo, useState } from "react";
import type { AgentAction } from "@/lib/agents/log";
import { LogList } from "./LogList";

export function LogFilter({ items }: { items: AgentAction[] }) {
  const [agent, setAgent] = useState("tous");
  const [status, setStatus] = useState("tous");
  const [q, setQ] = useState("");
  const list = useMemo(
    () => items.filter((a) => (agent === "tous" || a.agent === agent) && (status === "tous" || a.status === status) && (!q || `${a.summary} ${a.detail ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [items, agent, status, q],
  );
  return (
    <div className="stack-m">
      <div className="form__row form__row--3">
        <div className="field">
          <label className="field__label" htmlFor="f-agent">Agent</label>
          <select id="f-agent" className="field__input" value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="tous">Tous</option>
            <option value="catalogue">Catalogue</option>
            <option value="service-client">Service client</option>
            <option value="commandes-stock">Commandes et stock</option>
            <option value="seo">SEO et visibilité IA</option>
            <option value="contenu">Contenu</option>
            <option value="rapport">Rapport</option>
            <option value="systeme">Atelier</option>
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
      <LogList items={list} />
    </div>
  );
}
