import { ROLES, lastReport } from "@/lib/agents/roles";
import { AGENTS } from "@/lib/agents/registry";
import { currentAgentId, getLog } from "@/lib/agents/log";
import { getRuns } from "@/lib/agents/run";
import { maintenanceLabels, maintenanceReports } from "@/lib/maintenance";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { AgentLauncher } from "@/components/admin/AgentLauncher";
import { LogList } from "@/components/admin/LogList";
import { When } from "@/components/admin/Status";
import { withRegistryNames } from "@/components/admin/agent-names";
import Link from "@/components/ui/Link";

const GRAVITE = { urgent: "Urgent", attention: "À regarder", info: "Pour information" } as const;

/**
 * Les coulisses de la Maison (retour de la créatrice du 01/11 : l'accueil de l'Atelier était trop
 * technique) : les agents principaux, la maintenance de nuit, les dernières actions, puis les rôles
 * de gestion quotidienne (mission, autonomie, dernier passage, relevés et avis du Contrôle).
 */
export default async function EquipePage() {
  const [reports, runs, [maintenance], log] = await Promise.all([Promise.all(ROLES.map((r) => lastReport(r.id))), getRuns(60), maintenanceReports(1), getLog(12)]);
  const names = withRegistryNames([...AGENTS, ...ROLES]);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Agents</h1>
        <p className="t-lead">Ils font le quotidien seuls, dans les règles des Réglages. Ce qui touche à l’argent vous attend dans « À valider ».</p>
      </header>

      <section className="panel" aria-labelledby="agents-title">
        <h2 id="agents-title" className="t-h3">
          Les agents principaux
        </h2>
        <ul className="team">
          {AGENTS.map((a) => {
            // un passage enregistré sous un ancien identifiant (« commandes-stock ») compte pour l'agent actuel
            const last = runs.find((r) => currentAgentId(r.agent) === a.id);
            return (
              <li key={a.id} className="team__agent">
                <h3 className="t-h4">{a.name}</h3>
                <p className="t-body">{a.mission}</p>
                <details className="team__regles">
                  <summary className="t-label">Ses règles</summary>
                  <p className="t-note t-left">{a.autonomy}</p>
                  <p className="t-note t-left">{a.schedule}</p>
                </details>
                <p className="t-note team__last">
                  {last ? (
                    <>
                      Dernier passage le <When iso={last.startedAt} />. {last.summary}
                    </>
                  ) : (
                    "Pas encore de passage."
                  )}
                </p>
                {a.id === "catalogue" ? (
                  <>
                    <AgentLauncher endpoint={atelierApi(`/agents/${a.id}`)} nom={a.name} label="Faire le bilan" />
                    <Link href={atelierHref("/catalogue")} className="btn btn--outline">
                      Nouvelle fiche
                    </Link>
                  </>
                ) : (
                  <AgentLauncher endpoint={atelierApi(`/agents/${a.id}`)} nom={a.name} />
                )}
              </li>
            );
          })}
        </ul>
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
          <p className="t-note">L’agent de maintenance passe chaque nuit : vérifications, corrections testées, déploiement seulement si tout est vert.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="log-title">
        <div className="panel__head">
          <h2 id="log-title" className="t-h3">
            Dernières actions
          </h2>
          <Link href={atelierHref("/journal")} className="link">
            Tout le journal
          </Link>
        </div>
        <LogList items={log} names={names} />
      </section>

      <h2 className="t-h3">Les rôles de gestion</h2>
      <ul className="team">
        {ROLES.map((r, i) => {
          const rep = reports[i];
          return (
            <li key={r.id} className="team__agent panel stack-s">
              <h3 className="t-h4">{r.name}</h3>
              <p className="t-body">{r.mission}</p>
              <details className="team__regles">
                <summary className="t-label">Ses règles</summary>
                <p className="t-note t-left">{r.autonomy}</p>
                <p className="t-note t-left">{r.run ? r.schedule : "En préparation"}</p>
              </details>
              {rep ? (
                <div className="stack-s">
                  <p className="t-note">
                    Dernier passage le <When iso={rep.at} />. {rep.resume}
                  </p>
                  {rep.findings.length ? (
                    <ul className="stack-s">
                      {rep.findings.slice(0, 6).map((f, k) => (
                        <li key={k} className="t-note t-left">
                          <span className={`status status--${f.gravite === "urgent" ? "failed" : f.gravite === "attention" ? "proposed" : "info"}`}>{GRAVITE[f.gravite]}</span> {f.lien ? <Link href={atelierHref(f.lien)}>{f.titre}</Link> : f.titre}
                          {f.detail ? <span className="t-soft"> · {f.detail}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {rep.controle.length ? (
                    <div className="stack-s">
                      <p className="t-label">Contrôle</p>
                      <ul className="stack-s">
                        {rep.controle.map((c, k) => (
                          <li key={k} className="t-note t-left">
                            {c.titre}
                            {c.detail ? <span className="t-soft"> · {c.detail}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {r.run ? <AgentLauncher endpoint={atelierApi(`/equipe/${r.id}`)} nom={r.name} variant="quiet" /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
