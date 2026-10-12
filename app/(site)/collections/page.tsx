import Link from "next/link";
import { collectionsPage } from "@/content/fr/pages";
import { getCollections } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";

export const metadata = pageMetadata({ ...collectionsPage.seo, path: "/collections" });
export const revalidate = 300;

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <>
      <PageHeader title={collectionsPage.h1} lead={collectionsPage.lead} crumbs={[{ name: "Collections", path: "/collections" }]} />
      {collections.map((c, i) => (
        <Section key={c.handle} theme={i % 2 ? "ink" : "ivory"} className="section--tall" labelledBy={`c-${c.handle}`}>
          <div className={`container grid-12 collection-row ${i % 2 ? "collection-row--flip" : ""}`}>
            <Link href={`/collections/${c.handle}`} className="collection-row__media" data-reveal aria-hidden="true" tabIndex={-1}>
              <Media image={c.cover} ratio="tall" sizes="(min-width: 64rem) 45vw, 100vw" className="reveal-img" />
            </Link>
            <div className="collection-row__text stack-m" data-reveal>
              <p className="eyebrow">
                {c.season}
                {c.current ? " · Collection en cours" : ""}
              </p>
              <h2 id={`c-${c.handle}`} className="t-script t-script--xl">
                {c.title}
              </h2>
              <p className="t-lead">{c.lead}</p>
              <p className="t-label t-soft">{c.products.length} pièces</p>
              <Link href={`/collections/${c.handle}`} className={`btn ${i % 2 ? "btn--gold" : ""}`}>
                Découvrir {c.title}
              </Link>
            </div>
          </div>
        </Section>
      ))}
    </>
  );
}
