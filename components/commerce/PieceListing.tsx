/**
 * Liste filtrable des pièces, commune à la page d'une collection et à toutes les pièces (maquette
 * PAGE PRODUIT) : la colonne « Filtrer par » (CollectionFilters), puis les cartes (ProductCard)
 * à photo aux angles arrondis, pastille « Nouveau », nom, prix et délai de fabrication.
 *
 * La sélection est lue dans l'adresse et appliquée ici, côté serveur : une adresse filtrée se
 * partage et s'affiche telle quelle. Textes : documents « boutique » (filtres, liste vide) et
 * « catalogue » (taille unique).
 */
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import type { Collection, Product } from "@/lib/commerce/types";
import { ProductCard } from "./ProductCard";
import { CollectionFilters } from "./CollectionFilters";
import { applyFilters, facets, readFilters, type FilterGroup, type FilterOption, type SearchParams } from "./piece-filters";
import s from "./PieceListing.module.css";

export type BoutiqueTexts = typeof import("@/content/site/fr/boutique.json");

export async function PieceListing({
  products,
  collections,
  searchParams,
  action,
  current,
  heading,
}: {
  /** pièces de la page : toutes, ou celles d'une collection */
  products: Product[];
  /** collections proposées par le filtre Collection */
  collections: Pick<Collection, "handle" | "title">[];
  searchParams: SearchParams;
  /** adresse de la page (formulaire des filtres, effacement) */
  action: string;
  /** collection de la page : son filtre mène aux autres collections et à toutes les pièces */
  current?: string;
  /** titre de la liste, pour les lecteurs d'écran */
  heading: string;
}) {
  const [t, catalogue] = await Promise.all([getDoc<BoutiqueTexts>("boutique"), getDoc<CatalogueTexts>("catalogue")]);
  const f = t.filtres;
  const bands = f.prix;
  const available = facets(products, bands);
  const inScope = collections.filter((c) => (current ? true : products.some((p) => p.collection === c.handle)));
  const values = readFilters(searchParams, {
    categories: available.categories,
    sizes: available.sizes,
    bands: available.bands,
    collections: current ? [] : inScope.map((c) => c.handle),
  });
  const found = applyFilters(products, values, bands);

  const collectionOptions: FilterOption[] = current
    ? [{ value: "", label: f.tout.collection, href: "/boutique" }, ...inScope.map((c) => ({ value: c.handle, label: c.title, href: `/collections/${c.handle}` }))]
    : [{ value: "", label: f.tout.collection }, ...inScope.map((c) => ({ value: c.handle, label: c.title }))];

  const all: FilterGroup[] = [
    {
      key: "categorie",
      label: f.groupes.categorie,
      value: values.categorie ?? "",
      options: [{ value: "", label: f.tout.categorie }, ...available.categories.map((c) => ({ value: c, label: t.categories[c] }))],
    },
    {
      key: "prix",
      label: f.groupes.prix,
      value: values.prix ?? "",
      options: [{ value: "", label: f.tout.prix }, ...available.bands.map((b) => ({ value: b.id, label: b.label }))],
    },
    {
      key: "taille",
      label: f.groupes.taille,
      value: values.taille ?? "",
      options: [{ value: "", label: f.tout.taille }, ...available.sizes.map((size) => ({ value: size, label: size === "TU" ? catalogue.taille.unique : size }))],
    },
    { key: "collection", label: f.groupes.collection, value: current ?? values.collection ?? "", options: collectionOptions },
  ];
  // un groupe sans autre choix que « Tout » ne filtre rien : il n'est pas proposé
  const groups = all.filter((g) => g.options.length > 1);

  return (
    <CollectionFilters action={action} groups={groups} count={found.length} texts={f}>
      <h2 className="sr-only">{heading}</h2>
      {found.length ? (
        <ul className={s.grid}>
          {found.map((p, i) => (
            <li key={p.handle}>
              <ProductCard product={p} priority={i < 2} sizes="(min-width: 90rem) 25vw, (min-width: 64rem) 33vw, (min-width: 30rem) 50vw, 100vw" />
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.empty}>
          <p className="t-lead t-left">{t.vide.texte}</p>
          <Link href={action} scroll={false} replace className="btn btn--outline">
            {t.vide.lien}
          </Link>
        </div>
      )}
    </CollectionFilters>
  );
}
