import Link from "@/components/ui/Link";
import { faq } from "@/content/fr/faq";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

export const metadata = pageMetadata({
  title: "Questions fréquentes — tailles, commandes, livraison | Awrea Paris",
  description: "Toutes les réponses sur Awrea Paris : fabrication à la main à Paris, pièces numérotées, tailles, précommandes, livraison, retours et sur mesure.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqSchema(faq.flatMap((g) => g.items))} />
      <PageHeader
        title="Questions fréquentes"
        lead="Les réponses aux questions que l’on nous pose le plus souvent. Une autre question ? Notre assistante vous répond à toute heure, et l’atelier sous 48 heures."
        crumbs={[{ name: "Questions fréquentes", path: "/faq" }]}
      />
      <Section theme="ivory" className="section section--flush-top" aria-label="Questions">
        <div className="container grid-12 faq">
          <nav className="faq__nav" aria-label="Thèmes">
            <ul className="stack">
              {faq.map((g, i) => (
                <li key={g.title}>
                  <a href={`#theme-${i}`} className="link link--quiet">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="faq__groups stack-l">
            {faq.map((g, i) => (
              <section key={g.title} id={`theme-${i}`} aria-labelledby={`theme-${i}-t`}>
                <h2 id={`theme-${i}-t`} className="t-label t-accent faq__title">
                  {g.title}
                </h2>
                {g.items.map((it) => (
                  <details key={it.q} className="disclosure disclosure--question">
                    <summary>{it.q}</summary>
                    <div className="disclosure__body">
                      <p className="t-body">{it.a}</p>
                    </div>
                  </details>
                ))}
              </section>
            ))}
            <p className="t-body">
              Vous ne trouvez pas votre réponse ? <Link href="/contact" className="text-link">Écrivez-nous</Link>.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
