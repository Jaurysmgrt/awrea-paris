import { atelierApi } from "@/lib/admin/path";
import { inscrites } from "@/lib/email/lettre";
import { EmailsTabs } from "@/components/admin/EmailsTabs";
import { When } from "@/components/admin/Status";

const ORIGINE: Record<string, string> = { lettre: "Formulaire du site", commande: "À la commande", compte: "Son compte", "pied-de-page": "Formulaire du site", accueil: "Formulaire du site" };

/** E-mails › Inscrites : qui reçoit la lettre, depuis quand, et le tableur à télécharger. */
export default async function InscritesPage() {
  const liste = await inscrites();
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">E-mails</h1>
        <EmailsTabs actif="/e-mails/inscrites" />
      </header>
      <section className="panel" aria-labelledby="inscrites-titre">
        <div className="panel__head">
          <h2 id="inscrites-titre" className="t-h3">
            {liste.length} inscrite{liste.length > 1 ? "s" : ""}
          </h2>
          {liste.length ? (
            <a className="btn btn--outline" href={atelierApi("/lettre/inscrites")} download>
              Télécharger le tableur
            </a>
          ) : null}
        </div>
        {liste.length ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">E-mail</th>
                  <th scope="col">Nom</th>
                  <th scope="col">Inscrite le</th>
                  <th scope="col">Origine</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((i) => (
                  <tr key={i.email}>
                    <th scope="row">{i.email}</th>
                    <td>{[i.prenom, i.nom].filter(Boolean).join(" ")}</td>
                    <td>{i.date ? <When iso={i.date} /> : null}</td>
                    <td>{ORIGINE[i.source] ?? "Formulaire du site"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="t-note">Personne n’est encore inscrite. Le formulaire « Suivez-nous » est en bas de chaque page du site.</p>
        )}
      </section>
    </div>
  );
}
