import { legalPages } from "@/content/fr/legal";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "./PageHeader";
import { Section } from "./Section";
import { formatDate } from "@/lib/format";

export function legalMetadata(slug: keyof typeof legalPages) {
  const p = legalPages[slug];
  return pageMetadata({ ...p.seo, path: `/${p.slug}` });
}

/** Pages pratiques et légales : même gabarit partout. */
export function LegalView({ slug }: { slug: keyof typeof legalPages }) {
  const p = legalPages[slug];
  return (
    <>
      <PageHeader title={p.title} lead={p.intro} crumbs={[{ name: p.title, path: `/${p.slug}` }]} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container-prose prose">
          {p.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              {s.paragraphs?.map((t) => <p key={t}>{t}</p>)}
              {s.list ? (
                <ul>
                  {s.list.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          <p className="t-note">Mise à jour : {formatDate(p.updated)}</p>
        </div>
      </Section>
    </>
  );
}
