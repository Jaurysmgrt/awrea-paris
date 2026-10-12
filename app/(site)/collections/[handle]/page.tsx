import { notFound } from "next/navigation";
import Link from "next/link";
import { getCollection, getCollections, getProductsByHandles } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { collectionSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { ProductCard } from "@/components/commerce/ProductCard";
import { GoldenLight } from "@/components/signature/GoldenLight";
import { identity } from "@/content/brand/identity";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ handle: c.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const c = await getCollection((await params).handle);
  if (!c) return {};
  return pageMetadata({ ...c.seo, path: `/collections/${c.handle}`, image: c.cover.src });
}

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const c = await getCollection((await params).handle);
  if (!c) notFound();
  const products = await getProductsByHandles(c.products);
  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: c.title,
          description: c.seo.description,
          path: `/collections/${c.handle}`,
          items: products.map((p) => ({ name: p.title, path: `/boutique/${p.handle}` })),
        })}
      />
      <Section theme="ink" as="header" className="collection-hero" labelledBy="collection-h1">
        <GoldenLight />
        <div className="container collection-hero__inner">
          <Breadcrumbs items={[{ name: "Collections", path: "/collections" }, { name: c.title, path: `/collections/${c.handle}` }]} />
          <p className="eyebrow">{c.season}</p>
          <h1 id="collection-h1" className="t-script t-script--xl collection-hero__title">
            {c.title}
          </h1>
          <p className="t-lead collection-hero__lead">{c.lead}</p>
        </div>
        <div className="collection-hero__media">
          <Media image={c.cover} ratio="tall" priority sizes="(min-width: 64rem) 40vw, 100vw" />
        </div>
      </Section>

      <Section theme="paper" className="section--tall" labelledBy="intention-title">
        <div className="container-prose stack-m">
          <p className="eyebrow">Intention</p>
          <h2 id="intention-title" className="t-h2">
            Les mots de la créatrice
          </h2>
          <div className="prose">
            {c.intention.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <p className="t-script collection-sign">{identity.founderTitle}</p>
        </div>
      </Section>

      {c.moodboard.length ? (
        <Section theme="ivory" className="section--tall" labelledBy="moodboard-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Moodboard</p>
              <h2 id="moodboard-title" className="t-h2">
                Ce que l’on voyait au mur de l’atelier
              </h2>
            </header>
            <ul className="moodboard">
              {c.moodboard.map((m, i) => (
                <li key={`${m.image.src}-${i}`} className={`moodboard__item moodboard__item--${m.span ?? "tall"}`} data-reveal>
                  <figure>
                    <Media image={m.image} ratio="auto" sizes="(min-width: 64rem) 40vw, 100vw" className="moodboard__media reveal-img" />
                    {m.caption ? <figcaption className="t-note media__caption">{m.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      <Section theme="pearl" className="section--tall" labelledBy="pieces-title">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">Les pièces</p>
            <h2 id="pieces-title" className="t-h2">
              {products.length} pièces, numérotées
            </h2>
            <Link href="/boutique" className="link section-head__link">
              Toute la boutique
            </Link>
          </header>
          <ul className="editorial-grid">
            {products.map((p, i) => (
              <li key={p.handle} className={`editorial-grid__item editorial-grid__item--${i % 4}`} data-reveal>
                <ProductCard product={p} sizes="(min-width: 64rem) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
