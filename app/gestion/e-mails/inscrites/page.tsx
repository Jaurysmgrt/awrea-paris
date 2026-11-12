import { atelierApi, atelierHref } from "@/lib/admin/path";
import { inscrites } from "@/lib/email/lettre";
import { libelleSource } from "@/lib/crm";
import { EmailsTabs } from "@/components/admin/EmailsTabs";
import { When } from "@/components/admin/Status";
import Link from "@/components/ui/Link";

const ORIGINE = (source: string) => libelleSource(source) || "Formulaire du site";

/**
 * E-mails › Inscrites : qui reçoit la lettre (les abonnées du CRM), depuis quand, d'où, et le tableur
 * à télécharger. Chaque fiche, et les inscriptions à confirmer ou les désinscrites, s'ouvrent dans
 * Clientes.
 */
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
        <p className="t-note">
          Seules les abonnées reçoivent la lettre. Les fiches, les inscriptions à confirmer et les désinscrites :{" "}
          <Link href={atelierHref("/clientes?segment=abonnees")} className="text-link">
            ouvrir les abonnées dans Clientes
          </Link>
          .
        </p>
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
                    <td>{ORIGINE(i.source)}</td>
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
