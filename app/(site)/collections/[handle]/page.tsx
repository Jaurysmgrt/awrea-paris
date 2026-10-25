import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCollection, getCollections, getProductsByHandles } from "@/lib/commerce";
import { findDoc, getDoc, isEditing } from "@/lib/edition/read";
import { slugOf } from "@/lib/edition/documents";
import { fill } from "@/lib/edition/fill";
import { pageMetadata } from "@/lib/seo/metadata";
import { collectionSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";
import { ModelePage, type ModeleContent } from "@/components/edition/ModelePage";
import { PieceListing } from "@/components/commerce/PieceListing";
import { FILTER_KEYS, hasFilterParams, type SearchParams } from "@/components/commerce/piece-filters";
import s from "./collection.module.css";

/**
 * Page d'une collection, d'après la maquette PAGE PRODUIT : grand titre centré « Collection
 * « Hypnotic Lace » » en Fraunces italique, le texte officiel de la collection (TEXTE DE
 * COLLECTION, mot pour mot, marqué data-officiel), puis la colonne « Filtrer par » et les cartes.
 * Textes : document « collections » ; filtres : document « boutique ».
 *
 * Une collection créée dans l'éditeur (modèle « Collection ») sans collection du catalogue
 * s'affiche comme les autres pages de modèle.
 */
type CollectionsTexts = typeof import("@/content/site/fr/collections.json");

export const revalidate = 300;

const modeleDoc = (handle: string) => `collection-${slugOf(handle)}`;

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ handle: c.handle }));
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollection(handle);
  if (!c) {
    const page = await findDoc<ModeleContent>(modeleDoc(handle), "fr", { plain: true });
    return page ? pageMetadata({ title: page.seo.title, description: page.seo.description, path: `/collections/${slugOf(handle)}` }) : {};
  }
  // les vues filtrées ne sont pas indexées : la page canonique reste celle de la collection
  return pageMetadata({ ...c.seo, path: `/collections/${c.handle}`, image: c.cover.src, noindex: hasFilterParams(sp) });
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<SearchParams> }) {
  const [{ handle }, sp] = await Promise.all([params, searchParams]);
  const c = await getCollection(handle);
  if (!c) {
    const doc = modeleDoc(handle);
    const [content, editing] = await Promise.all([findDoc<ModeleContent>(doc), isEditing()]);
    if (!content) notFound();
    return <ModelePage doc={doc} content={content} editing={editing} crumbs={[{ name: content.titre, path: `/collections/${slugOf(handle)}` }]} />;
  }

  // filtre Collection envoyé sans JavaScript : une autre collection, ou toutes les pièces
  const asked = sp.collection === undefined ? null : [sp.collection].flat()[0] ?? "";
  if (asked !== null && asked !== c.handle) {
    const others = await getCollections();
    const rest = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = [sp[k]].flat()[0];
      if (k !== "collection" && v) rest.set(k, v);
    }
    const path = others.some((o) => o.handle === asked) ? `/collections/${asked}` : asked === "" ? "/boutique" : `/collections/${c.handle}`;
    redirect(rest.size ? `${path}?${rest}` : path);
  }

  const [t, products, collections] = await Promise.all([getDoc<CollectionsTexts>("collections"), getProductsByHandles(c.products), getCollections()]);
  const pieces = products.filter((p) => p.variants.length > 0);
  const official = c.officiel ? "" : undefined;
  const intro = [c.lead, ...c.intention].filter((x) => x.trim());

  return (
    <>
      <JsonLd
        data={collectionSchema({
          title: c.title,
          description: c.seo.description,
          path: `/collections/${c.handle}`,
          items: pieces.map((p) => ({ name: p.title, path: `/boutique/${p.handle}` })),
        })}
      />
      <PageHeader
        title={fill(t.collection.titre, { collection: c.title })}
        crumbs={[
          { name: t.titre, path: "/collections" },
          { name: c.title, path: `/collections/${c.handle}` },
        ]}
      >
        {intro.length ? (
          <div className={s.texte} data-officiel={official}>
            {c.lead.trim() ? <p className={`t-lead t-center ${s.accroche}`}>{c.lead}</p> : null}
            {c.intention.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        ) : null}
      </PageHeader>

      <Section theme="ivory" className="section section--flush-top" aria-label={t.collection.piecesTitre}>
        <div className="container">
          <PieceListing products={pieces} collections={collections} searchParams={sp} action={`/collections/${c.handle}`} current={c.handle} heading={t.collection.piecesTitre} />
        </div>
      </Section>

      {c.moodboard.length ? (
        <Section theme="pearl" className="section--tall" labelledBy="moodboard-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">{t.collection.moodboard.surtitre}</p>
              <h2 id="moodboard-title" className="t-h2">
                {t.collection.moodboard.titre}
              </h2>
            </header>
            <ul className="moodboard">
              {c.moodboard.map((m, i) => (
                <li key={`${m.image.src}-${i}`} className={`moodboard__item moodboard__item--${m.span ?? "tall"}`}>
                  <figure>
                    <Media image={m.image} ratio="auto" sizes="(min-width: 64rem) 40vw, 100vw" className="moodboard__media media--card" />
                    <ProvisionalNote image={m.image} />
                    {m.caption ? <figcaption className="t-note media__caption">{m.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}
