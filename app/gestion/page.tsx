import Link from "@/components/ui/Link";
import { getProposals } from "@/lib/agents/perform";
import { getLog } from "@/lib/agents/log";
import { getRuns } from "@/lib/agents/run";
import { AGENTS } from "@/lib/agents/registry";
import { getOrders } from "@/lib/commerce/orders";
import { listInbox } from "@/lib/inbox";
import { kv } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import type { AuditReport } from "@/lib/agents/seo-audit";
import { ProposalCard } from "@/components/admin/ProposalCard";
import { LogList } from "@/components/admin/LogList";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { maintenanceLabels, maintenanceReports } from "@/lib/maintenance";

export default async function GestionHome() {
  const [proposals, log, runs, orders, inbox, audits, [maintenance]] = await Promise.all([
    getProposals(),
    getLog(12),
    getRuns(60),
    getOrders(),
    listInbox(500),
    kv.list<AuditReport>("seo:audits", 1),
    maintenanceReports(1),
  ]);
  // composant serveur dynamique : rendu une seule fois par requête, l'heure courante est voulue
  // eslint-disable-next-line react-hooks/purity
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const week = orders.filter((o) => new Date(o.createdAt).getTime() >= since && !["refunded", "pending"].includes(o.status));
  const revenue = week.reduce((s, o) => s + o.total, 0);
  const pending = proposals.filter((p) => p.status === "pending");
  const toAnswer = inbox.filter((m) => ["new", "drafted", "escalated"].includes(m.status));
  const greeting = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date());

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="eyebrow">{greeting}</p>
        <h1 className="t-h1">Bonjour.</h1>
        <p className="t-lead">Voici l’atelier en un coup d’œil : ce que les agents ont fait, et ce qui attend votre décision.</p>
      </header>

      <dl className="kpis">
        <div>
          <dt className="t-label">Ventes · 7 jours</dt>
          <dd className="kpis__value">{formatPrice(revenue)}</dd>
          <dd className="t-note">{week.length} commande(s)</dd>
        </div>
        <div>
          <dt className="t-label">À valider</dt>
          <dd className="kpis__value">{pending.length}</dd>
          <dd className="t-note">
            <Link href="/gestion/validations" className="text-link">
              Voir les propositions
            </Link>
          </dd>
        </div>
        <div>
          <dt className="t-label">Messages à traiter</dt>
          <dd className="kpis__value">{toAnswer.length}</dd>
          <dd className="t-note">
            <Link href="/gestion/messages" className="text-link">
              Ouvrir la boîte
            </Link>
          </dd>
        </div>
        <div>
          <dt className="t-label">Santé SEO</dt>
          <dd className="kpis__value">{audits[0] ? `${audits[0].score}/100` : "—"}</dd>
          <dd className="t-note">{audits[0] ? `${audits[0].issues.length} point(s) relevé(s)` : "Aucun audit encore"}</dd>
        </div>
      </dl>

      <section className="panel" aria-labelledby="todo-title">
        <h2 id="todo-title" className="t-h3">
          À valider
        </h2>
        {pending.length ? (
          <div className="stack-m">
            {pending.slice(0, 4).map((p) => (
              <ProposalCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="t-note">Rien n’attend votre décision. Les agents s’occupent du quotidien.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="maint-title">
        <h2 id="maint-title" className="t-h3">
          Maintenance du site
        </h2>
        {maintenance ? (
          <div className="stack-s">
            <p>
              <span className={`status status--${maintenance.status === "ok" || maintenance.status === "corrige" ? "done" : "failed"}`}>{maintenanceLabels[maintenance.status]}</span>{" "}
              <span className="t-note">
                <When iso={maintenance.date} />
              </span>
            </p>
            <p className="t-body">{maintenance.summary}</p>
            {maintenance.details.length ? (
              <ul className="stack-s t-note">
                {maintenance.details.slice(0, 8).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
            {maintenance.link ? (
              <a href={maintenance.link} className="text-link" target="_blank" rel="noopener noreferrer">
                Voir le détail sur GitHub
              </a>
            ) : null}
          </div>
        ) : (
          <p className="t-note">L’agent de maintenance passe chaque nuit : vérifications, corrections testées, déploiement seulement si tout est vert.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="team-title">
        <h2 id="team-title" className="t-h3">
          L’équipe
        </h2>
        <ul className="team">
          {AGENTS.map((a) => {
            const last = runs.find((r) => r.agent === a.id);
            return (
              <li key={a.id} className="team__agent">
                <h3 className="t-h4">{a.name}</h3>
                <p className="t-body">{a.mission}</p>
                <p className="t-note">{a.autonomy}</p>
                <p className="t-label t-soft">{a.schedule}</p>
                <p className="t-note team__last">
                  {last ? (
                    <>
                      Dernier passage <When iso={last.startedAt} /> — {last.summary}
                    </>
                  ) : (
                    "Pas encore de passage."
                  )}
                </p>
                {a.cron ? (
                  <ActionButton endpoint={`/api/gestion/agents/${a.id}`} label="Lancer maintenant" busyLabel="L’agent travaille…" />
                ) : (
                  <Link href="/gestion/catalogue" className="btn">
                    Nouvelle fiche
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel" aria-labelledby="log-title">
        <div className="panel__head">
          <h2 id="log-title" className="t-h3">
            Dernières actions
          </h2>
          <Link href="/gestion/journal" className="link">
            Tout le journal
          </Link>
        </div>
        <LogList items={log} />
      </section>
    </div>
  );
}
