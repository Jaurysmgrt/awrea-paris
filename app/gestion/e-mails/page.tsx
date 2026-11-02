import Link from "@/components/ui/Link";
import { kv } from "@/lib/store";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { renderEmailDoc } from "@/lib/email/documents";
import { LETTRE_DOC, envoisLettre, etatLettre, inscrites } from "@/lib/email/lettre";
import { EmailsTabs } from "@/components/admin/EmailsTabs";
import { LettreActions } from "@/components/admin/LettreActions";
import { ActionButton } from "@/components/admin/ActionButton";
import { CopyButton } from "@/components/admin/CopyButton";
import { When } from "@/components/admin/Status";

type Idee = { id: string; date: string; status: "draft" | "published" | "archived"; kind: "instagram" | "newsletter"; title: string; body: string; subject?: string; preheader?: string };

/**
 * E-mails › La lettre (demande de la créatrice du 02/11) : la lettre telle qu'elle arrivera, la
 * modifier, s'envoyer un essai, l'envoyer à toutes les inscrites ; les lettres déjà parties ; les
 * idées de lettre préparées par l'agent Contenu (auparavant dans « Contenus »).
 */
export default async function LettrePage() {
  const [etat, liste, envois, mail, idees] = await Promise.all([
    etatLettre(),
    inscrites(),
    envoisLettre(),
    renderEmailDoc(LETTRE_DOC, { vars: { prenom: "Camille" } }),
    kv.list<Idee>("content:drafts", 200).then((l) => l.filter((d) => d.kind === "newsletter" && d.status !== "archived")),
  ]);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">E-mails</h1>
        <EmailsTabs actif="/e-mails" />
      </header>

      <section className="panel" aria-labelledby="lettre-titre">
        <h2 id="lettre-titre" className="t-h3">
          La lettre
        </h2>
        <div className="lettre">
          <iframe className="lettre__apercu" title="Aperçu de la lettre" sandbox="" srcDoc={mail?.html ?? ""} loading="lazy" />
          <div className="stack-m">
            <p className="t-h4">{etat.sujet && !etat.sujet.startsWith("[") ? etat.sujet : "Sans objet pour l’instant"}</p>
            <p>
              <span className={etat.prete ? "status status--done" : "status status--proposed"}>{etat.prete ? "Prête à partir" : "Pas encore prête"}</span>
            </p>
            {etat.raison ? <p className="t-note t-left">{etat.raison}</p> : null}
            <Link className="btn btn--outline" href={atelierHref(`/e-mails/${LETTRE_DOC}`)}>
              Écrire la lettre
            </Link>
            <LettreActions nombre={liste.length} prete={etat.prete} />
          </div>
        </div>
      </section>

      {envois.length ? (
        <section className="panel" aria-labelledby="parties-titre">
          <h2 id="parties-titre" className="t-h3">
            Lettres parties
          </h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Objet</th>
                  <th scope="col">Inscrites</th>
                </tr>
              </thead>
              <tbody>
                {envois.map((e) => (
                  <tr key={`${e.at}-${e.versionId}`}>
                    <td>
                      <When iso={e.at} />
                    </td>
                    <th scope="row">{e.sujet}</th>
                    <td>{e.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {idees.length ? (
        <section className="panel" aria-labelledby="idees-titre">
          <h2 id="idees-titre" className="t-h3">
            Idées de l’agent Contenu
          </h2>
          <div className="stack-l">
            {idees.map((l) => (
              <article key={l.id} className="letter-draft stack">
                <p className="t-label t-soft">
                  <When iso={l.date} />
                </p>
                <h3 className="t-h4">{l.subject ?? l.title}</h3>
                <div className="prose">
                  {l.body.split(/\n{2,}/).map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
                <div className="proposal__actions">
                  <CopyButton text={l.body} label="Copier le texte" />
                  <ActionButton endpoint={atelierApi(`/contenus/${l.id}`)} body={{ status: "archived" }} label="Archiver" variant="quiet" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
