import { ROLES, lastReport } from "@/lib/agents/roles";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import Link from "@/components/ui/Link";

const GRAVITE = { urgent: "Urgent", attention: "À regarder", info: "Pour information" } as const;

/** Les rôles de gestion quotidienne : mission, autonomie, dernier passage, relevés et avis du Contrôle. */
export default async function EquipePage() {
  const reports = await Promise.all(ROLES.map((r) => lastReport(r.id)));
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Équipe</h1>
        <p className="t-lead">Chaque rôle veille sur une partie de la Maison. Il agit seul sur le quotidien et vous propose ce qui touche à l’argent ou ne se défait pas. Le Contrôle relit chaque passage avant qu’il n’arrive ici.</p>
      </header>
      <ul className="team">
        {ROLES.map((r, i) => {
          const rep = reports[i];
          return (
            <li key={r.id} className="team__agent panel stack-s">
              <h2 className="t-h4">{r.name}</h2>
              <p className="t-body">{r.mission}</p>
              <p className="t-note">{r.autonomy}</p>
              <p className="t-label t-soft">{r.run ? r.schedule : "En préparation"}</p>
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
              {r.run ? <ActionButton endpoint={atelierApi(`/equipe/${r.id}`)} label="Lancer maintenant" busyLabel="Passage en cours…" variant="quiet" /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
