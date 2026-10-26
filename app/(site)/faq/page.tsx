import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { getAllProducts } from "@/lib/commerce";
import { faqGroups, faqVars, type FaqDoc } from "@/content/fr/faq";
import { getLocale } from "@/lib/i18n/server";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

/**
 * Questions fréquentes : document de contenu « faq » (content/site/fr/faq.json), modifiable dans
 * l'éditeur Édition. Les délais de fabrication viennent du catalogue ({hauts}, {robes}), la livraison
 * offerte des réglages ({seuil}) ; les réponses suivent les conditions générales de vente officielles.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<FaqDoc>("faq", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/faq" });
}

/**
 * Réponse avec ses liens [libellé](/adresse) vers les pages du site, et ses repères
 * « [À COMPLÉTER : …] » bien visibles (information que la Maison n'a pas encore donnée).
 */
function Answer({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(\/[^)\s]*\)|\[\s*À COMPLÉTER[^\]]*\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
        if (m) {
          return (
            <Link key={i} href={m[2]} className="text-link">
              {m[1]}
            </Link>
          );
        }
        return /^\[\s*À COMPLÉTER/.test(part) ? (
          <mark key={i} className="todo">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}

export default async function FaqPage() {
  const [t, plain, products, catalogue, locale] = await Promise.all([getDoc<FaqDoc>("faq"), getDoc<FaqDoc>("faq", { plain: true }), getAllProducts().catch(() => []), getDoc<CatalogueTexts>("catalogue", { plain: true }), getLocale()]);
  // délais et prix écrits comme dans la langue de la page (« 2 à 3 semaines », « 2 to 3 weeks »)
  const vars = faqVars(products, { delai: catalogue.delai, locale });
  const groups = faqGroups(t, vars, { links: true });
  // données structurées : texte brut, sans lien ni repère « à compléter »
  const schemaItems = faqGroups(plain, vars, { withoutToComplete: true }).flatMap((g) => g.items);
  return (
    <>
      <JsonLd data={faqSchema(schemaItems)} />
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: plain.titre, path: "/faq" }]} />
      <Section theme="ivory" className="section section--flush-top" aria-label={t.titre}>
        <div className="container grid-12 faq">
          <nav className="faq__nav" aria-label={t.themes}>
            <ul className="stack">
              {groups.map((g, i) => (
                <li key={g.id}>
                  <a href={`#theme-${i}`} className="link link--quiet">
                    {g.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="faq__groups stack-l">
            {groups.map((g, i) => (
              <section key={g.id} id={`theme-${i}`} aria-labelledby={`theme-${i}-t`}>
                <h2 id={`theme-${i}-t`} className="t-label t-accent faq__title">
                  {g.title}
                </h2>
                {g.items.map((it) => (
                  <details key={it.id} id={`${g.id}-${it.id}`} className="disclosure disclosure--question">
                    <summary>{it.q}</summary>
                    <div className="disclosure__body">
                      <p className="t-body">
                        <Answer text={it.a} />
                      </p>
                    </div>
                  </details>
                ))}
              </section>
            ))}
            <p className="t-body">
              {t.fin.texte}{" "}
              <Link href="/contact" className="text-link">
                {t.fin.lien}
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
