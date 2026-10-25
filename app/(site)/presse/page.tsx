import type { Metadata } from "next";
import { getDoc } from "@/lib/edition/read";
import { identity } from "@/content/brand/identity";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { formatMonth } from "@/lib/format";

type Presse = typeof import("@/content/site/fr/presse.json");
/** Une parution réelle, citée mot pour mot (date au format AAAA-MM). */
interface Parution {
  outlet: string;
  title: string;
  date: string;
  quote: string;
  url?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Presse>("presse", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/presse" });
}

/**
 * Presse : les parutions réelles seulement (aucune parution d'exemple), puis le contact de la
 * Maison. Tant que la liste est vide, la page ne montre que le contact.
 */
export default async function PressePage() {
  const t = await getDoc<Presse>("presse");
  const parutions = t.articles as Parution[];
  return (
    <>
      <PageHeader giant title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/presse" }]} />
      {parutions.length ? (
        <Section theme="ivory" className="section section--flush-top" labelledBy="parutions">
          <div className="container">
            <h2 id="parutions" className="sr-only">
              {t.parutions}
            </h2>
            <ul className="press-list">
              {parutions.map((a) => (
                <li key={a.title} className="press-item" data-reveal>
                  <p className="t-label t-soft">
                    {a.outlet} · {formatMonth(a.date)}
                  </p>
                  <h3 className="t-h3">{a.title}</h3>
                  <blockquote cite={a.url || undefined}>
                    <p className="t-lead">{`« ${a.quote} »`}</p>
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
      <Section theme="pearl" className="section" labelledBy="press-contact">
        <div className="container grid-12 press-contact">
          <div className="stack-m">
            <h2 id="press-contact" className="t-h3">
              {t.contact.titre}
            </h2>
            <p className="t-body">{t.contact.texte}</p>
            <p>
              <a href={`mailto:${identity.email}`} className="link">
                {identity.email}
              </a>
            </p>
          </div>
          <div className="stack-m">
            <h2 className="t-h3">{t.kit.titre}</h2>
            <p className="t-body">{t.kit.texte}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
