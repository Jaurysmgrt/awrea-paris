import { emailIds, renderEmailDoc, emailDoc, emailCommon } from "@/lib/email/documents";
import { EmailCommonForm } from "@/components/admin/EmailCommonForm";
import { draftOf, historyOf } from "@/lib/edition/store";
import { atelierHref } from "@/lib/admin/path";
import { When } from "@/components/admin/Status";
import Link from "@/components/ui/Link";

const FAMILLES = [
  { id: "commande", title: "Commandes", intro: "Envoyés par Shopify. Une fois modifiés ici, exportez-les vers les notifications Shopify." },
  { id: "service", title: "Service", intro: "Envoyés par le site : chaque étape de la confection d’une commande, de « Commande reçue » à « Expédiée », puis les retours, les rendez-vous, le compte et les certificats." },
  { id: "lettre", title: "Lettres", intro: "Les lettres de l’atelier et les messages qui suivent une inscription." },
] as const;

/** Galerie des e-mails : chacun tel qu'il arrive, avec ses exemples, et son état. */
export default async function EmailsPage() {
  const [ids, commun] = await Promise.all([emailIds(), emailCommon("fr", true)]);
  const list = (
    await Promise.all(
      ids.map(async ({ id, label }) => {
        const doc = await emailDoc(id, "fr");
        if (!doc) return null;
        const vars = Object.fromEntries(Object.entries(doc.variables).map(([k, v]) => [k, v.exemple]));
        const [mail, draft, history] = await Promise.all([renderEmailDoc(id, { vars }), draftOf(id, "fr"), historyOf(id, "fr")]);
        return { id, label, doc, html: mail?.html ?? "", subject: mail?.subject ?? "", draft: Boolean(draft), publishedAt: history[0]?.at || null };
      }),
    )
  ).filter((x) => x !== null);

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">E-mails</h1>
        <p className="t-lead">Chaque e-mail se compose comme une page : des blocs dans l’allure de la Maison, des textes que vous écrivez, un aperçu dans chaque messagerie. Rien ne change avant « Publier ».</p>
      </header>
      {FAMILLES.map((f) => {
        const items = list.filter((m) => m.doc.famille === f.id);
        if (!items.length) return null;
        return (
          <section key={f.id} className="panel stack" aria-labelledby={`famille-${f.id}`}>
            <h2 id={`famille-${f.id}`} className="t-h3">{f.title}</h2>
            <p className="t-note">{f.intro}</p>
            <ul className="email-gallery">
              {items.map((m) => (
                <li key={m.id} className="email-gallery__item stack">
                  <div className="email-gallery__frame">
                    <iframe title={`Aperçu : ${m.label}`} sandbox="" srcDoc={m.html} loading="lazy" tabIndex={-1} />
                  </div>
                  <h3 className="t-h4">{m.label}</h3>
                  <p className="t-note t-left">{m.doc.quand}</p>
                  <p className="t-label t-soft">
                    {m.draft ? "Modifié, pas encore publié" : m.publishedAt ? <>Publié le <When iso={m.publishedAt} /></> : "Version d’origine"}
                  </p>
                  <Link className="btn" href={atelierHref(`/e-mails/${m.id}`)}>
                    Modifier l’e-mail
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!list.length ? <p className="t-note">Aucun e-mail pour l’instant.</p> : null}
      <section id="communs" className="panel stack" aria-labelledby="communs-titre">
        <h2 id="communs-titre" className="t-h3">Textes communs</h2>
        <p className="t-note">Repris en bas de chaque e-mail.</p>
        <EmailCommonForm
          fields={[
            { key: "devise", label: "Devise", value: commun.devise },
            { key: "lignePied", label: "Ligne sous la devise", value: commun.lignePied },
            { key: "mentions", label: "Mentions (raison sociale, adresse)", value: commun.mentions },
            { key: "desinscription", label: "Lien de désinscription des lettres", value: commun.desinscription },
            { key: "voirPiece", label: "Lien sous une pièce", value: commun.voirPiece },
            { key: "total", label: "Dernière ligne d’une commande", value: commun.total },
          ]}
        />
      </section>
    </div>
  );
}
