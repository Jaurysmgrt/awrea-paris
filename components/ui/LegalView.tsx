import { Fragment } from "react";
import { legalPages, type LegalSlug } from "@/content/fr/legal";
import { cookieCategories, cookieInventory } from "@/content/fr/cookies";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { fromPage, type LegalBlock, type LegalDocContent, type LegalPageView } from "@/lib/legal/doc";
import { pageMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/format";
import { LegalText } from "@/components/legal/LegalText";
import { WithdrawalForm } from "@/components/legal/WithdrawalForm";
import { CookieSettingsButton } from "@/components/consent/ConsentProvider";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";
import styles from "./LegalView.module.css";

/** Textes communs des pages légales : content/site/fr/juridique.json. */
type JuridiqueTexts = typeof import("@/content/site/fr/juridique.json");

/** Métadonnées d'une page légale écrite dans le code (content/fr/legal.ts). */
export function legalMetadata(slug: LegalSlug) {
  const p = legalPages[slug];
  return pageMetadata({ ...p.seo, path: `/${p.slug}` });
}

/** Métadonnées d'une page légale tenue dans un document de l'éditeur (CGV, mentions légales). */
export async function legalDocMetadata(doc: string, path: string) {
  const d = await getDoc<LegalDocContent>(doc, "fr", { plain: true });
  return pageMetadata({ title: d.seo.title, description: d.seo.description, path });
}

/** Vue d'une page légale écrite dans le code. */
export const legalPageView = (slug: LegalSlug): LegalPageView => fromPage(legalPages[slug]);

function CookieTable({ t }: { t: JuridiqueTexts["cookies"] }) {
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
                  <th scope="col">{t.nom}</th>
                  <th scope="col">{t.fournisseur}</th>
                  <th scope="col">{t.finalite}</th>
                  <th scope="col">{t.duree}</th>
                  <th scope="col">{t.nature}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.name}>
                    <th scope="row">
                      <code>{c.name}</code>
                    </th>
                    <td data-label={t.fournisseur}>{c.provider}</td>
                    <td data-label={t.finalite}>{c.purpose}</td>
                    <td data-label={t.duree}>{c.duration}</td>
                    <td data-label={t.nature}>{c.kind}</td>
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

/** Formulaire type de rétractation (annexe à l'article R221-1 du Code de la consommation). */
function WithdrawalModel({ t }: { t: JuridiqueTexts["modeleRetractation"] }) {
  return (
    <div className="legal__box legal__model">
      <p className="t-label">{t.titre}</p>
      <p>{t.consigne}</p>
      <p>
        <LegalText text={t.destinataire} />
      </p>
      {t.lignes.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
      <p className="t-note">{t.note}</p>
    </div>
  );
}

function Block({ block, t }: { block: LegalBlock; t: JuridiqueTexts }) {
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
        {block.list.map((item, i) => (
          <li key={i}>
            <LegalText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if ("lines" in block) {
    // lignes courtes (coordonnées) : une information par ligne, au fer à gauche
    return (
      <p className="t-left">
        {block.lines.map((l, i) => (
          <Fragment key={i}>
            {i ? <br /> : null}
            <LegalText text={l} />
          </Fragment>
        ))}
      </p>
    );
  }
  if ("h3" in block) {
    return (
      <h3 id={block.id} className={styles.intertitre}>
        <LegalText text={block.h3} />
      </h3>
    );
  }
  if ("h4" in block) {
    return (
      <h4 className={styles.sousTitre}>
        <LegalText text={block.h4} />
      </h4>
    );
  }
  if ("table" in block) {
    return (
      <div className="table-scroll legal__table">
        <table className="table">
          <caption className="sr-only">{block.table.caption}</caption>
          <thead>
            <tr>
              {block.table.head.map((h, i) => (
                <th key={i} scope="col">
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
        {block.box.paragraphs.map((p, i) => (
          <p key={i}>
            <LegalText text={p} />
          </p>
        ))}
      </div>
    );
  }
  switch (block.widget) {
    case "cookie-table":
      return <CookieTable t={t.cookies} />;
    case "cookie-settings":
      return (
        <p className="legal__action">
          <CookieSettingsButton className="btn" />
        </p>
      );
    case "withdrawal-form":
      return <WithdrawalForm />;
    case "withdrawal-model":
      return <WithdrawalModel t={t.modeleRetractation} />;
  }
}

/**
 * Pages légales et pratiques : même gabarit partout. Date de mise à jour et version en tête,
 * sommaire cliquable, texte justifié avec césure, repères « À COMPLÉTER » bien visibles.
 * Les textes officiels de la créatrice (CGV, mentions légales) sont rendus avec data-officiel :
 * repris mot pour mot, seule leur typographie est contrôlée (scripts/controle-ecriture.ts).
 */
export async function LegalView(props: { page: LegalPageView } | { slug: LegalSlug }) {
  const page = "page" in props ? props.page : legalPageView(props.slug);
  const t = await getDoc<JuridiqueTexts>("juridique");
  const official = (yes: boolean) => (yes ? { "data-officiel": "" } : {});
  return (
    <>
      <PageHeader title={page.title} lead={page.lead ? <LegalText text={page.lead} /> : undefined} crumbs={[{ name: page.title, path: page.path }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container legal">
          <p className="legal__updated t-label">
            {fill(t.misAJour, { date: formatDate(page.updated) })}
            {page.version ? ` · ${fill(t.version, { version: page.version })}` : ""}
          </p>
          {page.sections.length > 2 ? (
            <nav className="legal__toc" aria-label={t.sommaire}>
              <p className="t-label">{t.sommaire}</p>
              <ol>
                {page.sections.map((s) => (
                  <li key={s.id} {...official(s.official)}>
                    <a href={`#${s.id}`} className="link-plain">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="prose legal__body">
            {page.preamble ? (
              <div className="legal__section" {...official(page.preamble.official)}>
                {page.preamble.blocks.map((b, i) => (
                  <Block key={i} block={b} t={t} />
                ))}
              </div>
            ) : null}
            {page.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titre`} className="legal__section" {...official(s.official)}>
                <h2 id={`${s.id}-titre`}>{s.title}</h2>
                {s.blocks.map((b, i) => (
                  <Block key={i} block={b} t={t} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
