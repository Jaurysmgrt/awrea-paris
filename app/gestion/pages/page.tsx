import { listDocuments, MODELES, type DocInfo } from "@/lib/edition/documents";
import { draftOf, historyOf, scheduled } from "@/lib/edition/store";
import { atelierApi, atelierHref } from "@/lib/admin/path";
import { When } from "@/components/admin/Status";
import { NewPageForm } from "@/components/admin/NewPageForm";
import { ActionButton } from "@/components/admin/ActionButton";

const GROUPS: { kind: DocInfo["kind"]; title: string; intro: string }[] = [
  { kind: "page", title: "Pages du site", intro: "L’accueil, la Maison, les services : chaque texte et chaque photo se change sur la page elle-même." },
  { kind: "modele", title: "Pages créées", intro: "Événements, articles du Journal, collections : invisibles du public tant qu’elles ne sont pas publiées." },
  { kind: "textes", title: "Textes de l’interface", intro: "Menu, boutons, messages du panier et du compte." },
  { kind: "legal", title: "Pages légales", intro: "Les champs entre crochets attendent une information à compléter." },
  { kind: "email", title: "E-mails", intro: "Confirmation de commande, expédition, lettre : modifiables comme une page." },
];

/** Pages modifiables dans l'éditeur visuel, leur état, et la création d'une page depuis un modèle. */
export default async function PagesPage() {
  const docs = await listDocuments();
  const programme = await scheduled();
  const state = Object.fromEntries(
    await Promise.all(
      docs.map(async (d) => {
        const [fr, en, history] = await Promise.all([draftOf(d.id, "fr"), draftOf(d.id, "en"), historyOf(d.id, "fr")]);
        return [d.id, { draft: Boolean(fr || en), draftAt: fr?.updatedAt ?? en?.updatedAt ?? null, publishedAt: history[0]?.at || null, live: history.length > 0 || d.kind !== "modele" }] as const;
      }),
    ),
  );
  const open = (chemin: string) => `${atelierApi("/edition/entrer")}?chemin=${encodeURIComponent(chemin)}`;

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Pages</h1>
        <p className="t-lead">Ouvrez une page pour la modifier directement sur le site. Rien ne change en ligne avant « Publier », et chaque version reste dans l’historique.</p>
      </header>

      <section className="panel stack" aria-labelledby="nouvelle-page">
        <h2 id="nouvelle-page" className="t-h3">Nouvelle page</h2>
        <NewPageForm modeles={Object.entries(MODELES).map(([id, m]) => ({ id, label: m.label, description: m.description, prefixe: m.prefixe }))} />
      </section>

      {programme.length ? (
        <section className="panel stack" aria-labelledby="programme">
          <h2 id="programme" className="t-h3">Publications programmées</h2>
          <ul className="stack">
            {programme.map((p) => (
              <li key={p.id} className="proposal__actions">
                <span className="t-body t-left">
                  {docs.find((d) => d.id === p.doc)?.label ?? p.doc} · {p.locale === "en" ? "anglais" : "français"} · <When iso={p.at} />
                </span>
                <ActionButton endpoint={`${atelierApi("/edition/programme")}?id=${p.id}&annuler=1`} label="Annuler" variant="quiet" confirm="Annuler cette publication programmée ? Les modifications restent en brouillon." />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {GROUPS.map((g) => {
        const list = docs.filter((d) => d.kind === g.kind);
        if (!list.length) return null;
        return (
          <section key={g.kind} className="panel stack" aria-labelledby={`pages-${g.kind}`}>
            <h2 id={`pages-${g.kind}`} className="t-h3">{g.title}</h2>
            <p className="t-note">{g.intro}</p>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col">État</th>
                    <th scope="col">Dernière publication</th>
                    <th scope="col"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    const st = state[d.id];
                    return (
                      <tr key={d.id}>
                        <th scope="row">{d.label}</th>
                        <td>{st.draft ? "Modifiée, pas encore en ligne" : st.live ? "En ligne" : "Brouillon"}</td>
                        <td>{st.publishedAt ? <When iso={st.publishedAt} /> : "Version d’origine"}</td>
                        <td>
                          <span className="proposal__actions">
                            {d.kind === "email" ? (
                              <a className="link" href={atelierHref(d.id === "email-commun" ? "/e-mails#communs" : `/e-mails/${d.id}`)}>
                                Modifier
                              </a>
                            ) : d.chemin ? (
                              <a className="link" href={open(d.chemin)}>
                                Modifier
                              </a>
                            ) : null}
                            {d.kind === "modele" ? (
                              <ActionButton endpoint={atelierApi("/edition/pages/supprimer")} body={{ id: d.id }} label="Supprimer" variant="quiet" confirm={`Supprimer la page « ${d.label} » ? Elle disparaît du site et de l’historique, sans retour possible.`} />
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
