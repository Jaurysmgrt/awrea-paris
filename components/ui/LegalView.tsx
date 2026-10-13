import { legalPages, type LegalBlock, type LegalSlug } from "@/content/fr/legal";
import { cookieCategories, cookieInventory } from "@/content/fr/cookies";
import { pageMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/format";
import { LegalText } from "@/components/legal/LegalText";
import { WithdrawalForm } from "@/components/legal/WithdrawalForm";
import { CookieSettingsButton } from "@/components/consent/ConsentProvider";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";

export function legalMetadata(slug: LegalSlug) {
  const p = legalPages[slug];
  return pageMetadata({ ...p.seo, path: `/${p.slug}` });
}

function CookieTable() {
  return (
    <>
      {cookieCategories.map((cat) => {
        const rows = cookieInventory.filter((c) => c.category === cat.key);
        if (!rows.length) return null;
        return (
          <div key={cat.key} className="table-scroll legal__table">
            <table className="table">
              <caption className="t-label">{cat.label}</caption>
              <thead>
                <tr>
                  <th scope="col">Nom</th>
                  <th scope="col">Fournisseur</th>
                  <th scope="col">Finalité</th>
                  <th scope="col">Durée</th>
                  <th scope="col">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">
                      <code>{c.name}</code>
                    </th>
                    <td data-label="Fournisseur">{c.provider}</td>
                    <td data-label="Finalité">{c.purpose}</td>
                    <td data-label="Durée">{c.duration}</td>
                    <td data-label="Type">{c.kind}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

function WithdrawalModel() {
  return (
    <div className="legal__box legal__model">
      <p className="t-label">Formulaire de rétractation</p>
      <p>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)</p>
      <p>
        À l’attention de <LegalText text="{{raisonSociale}}, {{siege}}, {{email}}" /> :
      </p>
      <p>Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :</p>
      <p>Commandé le (*)/reçu le (*) :</p>
      <p>Nom du (des) consommateur(s) :</p>
      <p>Adresse du (des) consommateur(s) :</p>
      <p>Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :</p>
      <p>Date :</p>
      <p className="t-note">(*) Rayez la mention inutile.</p>
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p>
        <LegalText text={block} />
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ul>
        {block.list.map((t) => (
          <li key={t}>
            <LegalText text={t} />
          </li>
        ))}
      </ul>
    );
  }
  if ("table" in block) {
    return (
      <div className="table-scroll legal__table">
        <table className="table">
          <caption className="sr-only">{block.table.caption}</caption>
          <thead>
            <tr>
              {block.table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) =>
                  j === 0 ? (
                    <th key={j} scope="row">
                      <LegalText text={cell} />
                    </th>
                  ) : (
                    <td key={j} data-label={block.table.head[j]}>
                      <LegalText text={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ("box" in block) {
    return (
      <div className="legal__box">
        {block.box.title ? <p className="t-label">{block.box.title}</p> : null}
        {block.box.paragraphs.map((t) => (
          <p key={t}>
            <LegalText text={t} />
          </p>
        ))}
      </div>
    );
  }
  switch (block.widget) {
    case "cookie-table":
      return <CookieTable />;
    case "cookie-settings":
      return (
        <p className="legal__action">
          <CookieSettingsButton className="btn" />
        </p>
      );
    case "withdrawal-form":
      return <WithdrawalForm />;
    case "withdrawal-model":
      return <WithdrawalModel />;
  }
}

/**
 * Pages légales et pratiques : même gabarit partout — date de mise à jour et version en tête,
 * sommaire cliquable, texte justifié avec césure, repères « À COMPLÉTER » bien visibles.
 */
export function LegalView({ slug }: { slug: LegalSlug }) {
  const p = legalPages[slug];
  const version = "version" in p ? p.version : undefined;
  return (
    <>
      <PageHeader title={p.title} lead={<LegalText text={p.intro} />} crumbs={[{ name: p.title, path: `/${p.slug}` }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container legal">
          <p className="legal__updated t-label">
            Mise à jour le {formatDate(p.updated)}
            {version ? ` · version ${version}` : ""}
          </p>
          {p.sections.length > 2 ? (
            <nav className="legal__toc" aria-label="Sommaire">
              <p className="t-label">Sommaire</p>
              <ol>
                {p.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="link-plain">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="prose legal__body">
            {p.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titre`} className="legal__section">
                <h2 id={`${s.id}-titre`}>{s.title}</h2>
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
