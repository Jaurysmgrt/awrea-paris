import Link from "@/components/ui/Link";
import { kv } from "@/lib/store";
import type { AuditReport } from "@/lib/agents/seo-audit";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { atelierApi } from "@/lib/admin/path";

export default async function SeoPage() {
  const [audits, ideas, llms] = await Promise.all([
    kv.list<AuditReport>("seo:audits", 8),
    kv.get<{ title: string; angle: string; target_query: string }[]>("seo:ideas"),
    kv.get<{ notes: string[]; updatedAt: string }>("ai:llms-notes"),
  ]);
  const last = audits[0];
  const order = { haute: 0, moyenne: 1, basse: 2 };
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">SEO et visibilité IA</h1>
        <p className="t-lead">Le dimanche à 5 h, l’agent audite le site et corrige les balises des fiches. Il publie aussi un article du Journal et met à jour llms.txt pour les moteurs de réponse IA.</p>
        <ActionButton endpoint={atelierApi("/agents/seo")} label="Lancer un audit" busyLabel="Audit en cours…" />
      </header>
      {last ? (
        <section className="panel" aria-labelledby="audit-title">
          <h2 id="audit-title" className="t-h3">Dernier audit du <When iso={last.date} /></h2>
          <dl className="kpis">
            <div><dt className="t-label">Score</dt><dd className="kpis__value">{last.score}/100</dd></div>
            <div><dt className="t-label">Pages auditées</dt><dd className="kpis__value">{last.pages}</dd></div>
            <div><dt className="t-label">Temps moyen</dt><dd className="kpis__value">{last.averageMs} ms</dd></div>
            <div><dt className="t-label">Points relevés</dt><dd className="kpis__value">{last.issues.length}</dd></div>
          </dl>
          {last.issues.length ? (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th scope="col">Priorité</th><th scope="col">Page</th><th scope="col">Type</th><th scope="col">Détail</th></tr></thead>
                <tbody>
                  {[...last.issues].sort((a, b) => order[a.severity] - order[b.severity]).map((i, k) => (
                    <tr key={k}><td><span className={`status status--${i.severity === "haute" ? "failed" : i.severity === "moyenne" ? "proposed" : "info"}`}>{i.severity}</span></td><td>{i.page}</td><td>{i.kind}</td><td>{i.detail}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="t-note">Aucun point relevé : tout est en ordre.</p>
          )}
        </section>
      ) : (
        <p className="t-note">Aucun audit pour le moment.</p>
      )}
      <section className="panel" aria-labelledby="ideas-title">
        <h2 id="ideas-title" className="t-h3">Idées d’articles</h2>
        {ideas?.length ? (
          <ul className="stack">{ideas.map((i) => <li key={i.title} className="t-body"><strong>{i.title}</strong> · {i.angle} <span className="t-note">(requête : {i.target_query})</span></li>)}</ul>
        ) : (
          <p className="t-note">Les idées apparaîtront après le premier passage.</p>
        )}
      </section>
      <section className="panel" aria-labelledby="llms-title">
        <h2 id="llms-title" className="t-h3">llms.txt</h2>
        <p className="t-body">Fichier lu par ChatGPT, Perplexity, Gemini et les autres moteurs de réponse : <Link href="/llms.txt" className="text-link">/llms.txt</Link> · <Link href="/llms-full.txt" className="text-link">/llms-full.txt</Link>.</p>
        {llms ? <><p className="t-note">Notes d’actualité mises à jour le {new Date(llms.updatedAt).toLocaleDateString("fr-FR")} :</p><ul className="stack">{llms.notes.map((n) => <li key={n} className="t-body">{n}</li>)}</ul></> : null}
      </section>
    </div>
  );
}
