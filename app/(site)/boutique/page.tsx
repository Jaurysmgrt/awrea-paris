import type { Metadata } from "next";
import { getCollections, getPublicProducts } from "@/lib/commerce";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { collectionSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { PieceListing, type BoutiqueTexts } from "@/components/commerce/PieceListing";
import { hasFilterParams, type SearchParams } from "@/components/commerce/piece-filters";

/**
 * Toutes les pièces, dans le langage de la maquette PAGE PRODUIT : grand titre centré, colonne
 * « Filtrer par » (Catégorie, Prix, Taille, Collection) et cartes aux angles arrondis. Textes :
 * document « boutique ».
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const [t, sp] = await Promise.all([getDoc<BoutiqueTexts>("boutique", { plain: true }), searchParams]);
  // les vues filtrées ne sont pas indexées : la page canonique reste /boutique
  return pageMetadata({ ...t.seo, path: "/boutique", noindex: hasFilterParams(sp) });
}

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [t, tPlain, sp, products, collections] = await Promise.all([
    getDoc<BoutiqueTexts>("boutique"),
    getDoc<BoutiqueTexts>("boutique", { plain: true }),
    searchParams,
    getPublicProducts(),
    getCollections(),
  ]);

  return (
    <>
      <JsonLd data={collectionSchema({ title: tPlain.titre, description: tPlain.seo.description, path: "/boutique", items: products.map((p) => ({ name: p.title, path: `/boutique/${p.handle}` })) })} />
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/boutique" }]} />
      <Section theme="ivory" className="section section--flush-top" aria-label={t.piecesTitre}>
        <div className="container">
          <PieceListing products={products} collections={collections} searchParams={sp} action="/boutique" heading={t.piecesTitre} />
        </div>
      </Section>
    </>
  );
}
