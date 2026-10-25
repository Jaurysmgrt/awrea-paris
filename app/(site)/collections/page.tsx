import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getCollections, getProductsByHandles } from "@/lib/commerce";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";

/**
 * Les collections de la Maison, dans le langage des maquettes : grand titre centré, puis chaque
 * collection avec sa photo aux angles arrondis, son accroche (texte officiel de la créatrice,
 * marqué data-officiel) et le lien vers sa page. Textes : document « collections ».
 */
type CollectionsTexts = typeof import("@/content/site/fr/collections.json");

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<CollectionsTexts>("collections", "fr", { plain: true });
  return pageMetadata({ ...t.seo, path: "/collections" });
}

export default async function CollectionsPage() {
  const [t, collections] = await Promise.all([getDoc<CollectionsTexts>("collections"), getCollections()]);
  const counts = await Promise.all(collections.map(async (c) => (await getProductsByHandles(c.products)).filter((p) => p.variants.length > 0).length));
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/collections" }]} />
      {collections.map((c, i) => {
        const n = counts[i];
        return (
          <Section key={c.handle} theme="ivory" className={i ? "section" : "section section--flush-top"} labelledBy={`c-${c.handle}`}>
            <div className={`container grid-12 collection-row ${i % 2 ? "collection-row--flip" : ""}`}>
              <div className="collection-row__media">
                <Link href={`/collections/${c.handle}`} aria-hidden="true" tabIndex={-1}>
                  <Media image={c.cover} ratio="tall" sizes="(min-width: 64rem) 45vw, 100vw" className="media--card" />
                </Link>
                <ProvisionalNote image={c.cover} />
              </div>
              <div className="collection-row__text stack-m">
                {c.season || c.current ? <p className="eyebrow">{[c.season, c.current ? t.enCours : ""].filter(Boolean).join(" · ")}</p> : null}
                <h2 id={`c-${c.handle}`} className="t-display">
                  {c.title}
                </h2>
                {c.lead.trim() ? (
                  <p className="t-lead t-left" data-officiel={c.officiel ? "" : undefined}>
                    {c.lead}
                  </p>
                ) : null}
                <p className="t-label t-soft">{n === 1 ? t.nombre.une : fill(t.nombre.plusieurs, { n })}</p>
                <div>
                  <Link href={`/collections/${c.handle}`} className="btn">
                    {fill(t.voir, { collection: c.title })}
                  </Link>
                </div>
              </div>
            </div>
          </Section>
        );
      })}
    </>
  );
}
