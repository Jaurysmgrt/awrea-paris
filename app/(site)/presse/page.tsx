import { press } from "@/content/fr/legal";
import { pressePage } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { formatMonth } from "@/lib/format";

export const metadata = pageMetadata({ ...pressePage.seo, path: "/presse" });

export default function PressePage() {
  return (
    <>
      <PageHeader title={pressePage.h1} lead={pressePage.lead} crumbs={[{ name: "Presse", path: "/presse" }]} />
      <Section theme="ivory" className="section section--flush-top" labelledBy="parutions">
        <div className="container">
          <h2 id="parutions" className="sr-only">
            Parutions
          </h2>
          <ul className="press-list">
            {press.articles.map((a) => (
              <li key={a.title} className="press-item" data-reveal>
                <p className="t-label t-soft">
                  {a.outlet} · {formatMonth(a.date)}
                </p>
                <h3 className="t-h3">{a.title}</h3>
                <blockquote>
                  <p className="t-lead">« {a.quote} »</p>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <Section theme="pearl" className="section" labelledBy="press-contact">
        <div className="container grid-12 press-contact">
          <div className="stack-m">
            <h2 id="press-contact" className="t-h3">
              {press.contact.title}
            </h2>
            <p className="t-body">{press.contact.text}</p>
            <p>
              <a href={`mailto:${press.contact.email}`} className="link">
                {press.contact.email}
              </a>
            </p>
          </div>
          <div className="stack-m">
            <h2 className="t-h3">{press.kit.title}</h2>
            <p className="t-body">{press.kit.text}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
