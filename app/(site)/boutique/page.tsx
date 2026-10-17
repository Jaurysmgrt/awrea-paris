import Link from "@/components/ui/Link";
import { boutique } from "@/content/fr/pages";
import { getPublicProducts, getProducts } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { collectionSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ProductCard } from "@/components/commerce/ProductCard";
import type { Category, Size } from "@/lib/commerce/types";

type SP = { categorie?: string; taille?: string; disponibilite?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filtered = Boolean(sp.categorie || sp.taille || sp.disponibilite);
  // les vues filtrées ne sont pas indexées : la page canonique reste /boutique
  return pageMetadata({ ...boutique.seo, path: "/boutique", noindex: filtered });
}

const SIZES: Size[] = ["XS", "S", "M", "L"];

function href(sp: SP, key: keyof SP, value: string | null) {
  const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  if (value === null || next.get(key) === value) next.delete(key);
  else next.set(key, value);
  const q = next.toString();
  return q ? `/boutique?${q}` : "/boutique";
}

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = boutique.categories.some((c) => c.value === sp.categorie) ? (sp.categorie as Category) : null;
  const size = SIZES.includes(sp.taille as Size) ? (sp.taille as Size) : null;
  const availability = sp.disponibilite === "disponible" ? "available" : sp.disponibilite === "sur-commande" ? "preorder" : null;
  const [products, all] = await Promise.all([getProducts({ category, size, availability }), getPublicProducts()]);
  const active = [category, size, availability].filter(Boolean).length;

  const groups = [
    { key: "categorie" as const, label: "Catégorie", options: boutique.categories.filter((c) => all.some((p) => p.category === c.value)).map((c) => ({ value: c.value, label: c.label })) },
    { key: "taille" as const, label: "Taille", options: SIZES.map((s) => ({ value: s, label: s })) },
    {
      key: "disponibilite" as const,
      label: "Disponibilité",
      options: [
        { value: "disponible", label: "Disponible" },
        { value: "sur-commande", label: "Sur commande" },
      ],
    },
  ];

  return (
    <>
      <JsonLd data={collectionSchema({ title: boutique.h1, description: boutique.seo.description, path: "/boutique", items: all.map((p) => ({ name: p.title, path: `/boutique/${p.handle}` })) })} />
      <PageHeader title={boutique.h1} lead={boutique.lead} crumbs={[{ name: "Boutique", path: "/boutique" }]} />
      <Section theme="ivory" className="section section--flush-top" aria-label="Pièces">
        <div className="container">
          <nav className="filters" aria-label="Filtrer les pièces">
            {groups.map((g) => (
              <div key={g.key} className="filters__group" role="group" aria-label={g.label}>
                <span className="t-label t-soft filters__label">{g.label}</span>
                <ul className="filters__options">
                  {g.options.map((o) => {
                    const on = sp[g.key] === o.value;
                    return (
                      <li key={o.value}>
                        <Link href={href(sp, g.key, o.value)} scroll={false} className="chip" aria-current={on ? "true" : undefined} rel="nofollow">
                          {o.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="filters__count t-label" aria-live="polite">
              {products.length} pièce{products.length > 1 ? "s" : ""}
              {active ? (
                <>
                  {" · "}
                  <Link href="/boutique" scroll={false} className="link link--quiet">
                    Tout effacer
                  </Link>
                </>
              ) : null}
            </p>
          </nav>

          {products.length ? (
            <ul className="shop-grid">
              {products.map((p, i) => (
                <li key={p.handle} data-reveal>
                  <ProductCard product={p} priority={i < 2} headingLevel={2} sizes="(min-width: 64rem) 30vw, (min-width: 30rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty stack-m t-center">
              <p className="t-lead t-center">Aucune pièce ne correspond à cette sélection pour le moment.</p>
              <p className="t-body t-center">L’atelier peut réaliser certaines pièces sur commande, à vos mesures.</p>
              <div>
                <Link href="/contact#rendez-vous" className="btn">
                  Demander une pièce sur mesure
                </Link>
              </div>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
