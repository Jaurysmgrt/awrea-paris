import { kv } from "@/lib/store";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { atelierApi } from "@/lib/admin/path";

type Report = { id: string; date: string; subject: string; summary: string; metrics: Record<string, string | number> };

export default async function RapportsPage() {
  const reports = await kv.list<Report>("reports", 52);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Rapports</h1>
        <p className="t-lead">Le lundi à 8 h, l’agent Rapport vous envoie la semaine en chiffres : ventes, pièces les plus vues, paniers abandonnés. Il termine par trois recommandations pour les jours qui viennent. Les rapports restent ici.</p>
        <ActionButton endpoint={atelierApi("/agents/rapport")} label="Générer le rapport maintenant" busyLabel="Rédaction…" />
      </header>
      {reports.length ? (
        reports.map((r, i) => (
          <details key={r.id} className="disclosure report" open={i === 0}>
            <summary>{r.subject} · <When iso={r.date} /></summary>
            <div className="disclosure__body stack-m">
              <dl className="kpis">{Object.entries(r.metrics).map(([k, v]) => <div key={k}><dt className="t-label">{k}</dt><dd className="kpis__value kpis__value--small">{v}</dd></div>)}</dl>
              <div className="prose">{r.summary.split(/\n{2,}/).map((t, k) => <p key={k} className="pre-line">{t}</p>)}</div>
            </div>
          </details>
        ))
      ) : (
        <p className="t-note">Aucun rapport pour le moment.</p>
      )}
    </div>
  );
}
