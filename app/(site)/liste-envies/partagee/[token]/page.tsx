import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ProductCard } from "@/components/commerce/ProductCard";
import { getProductsByHandles } from "@/lib/commerce";
import { getSharedWishlist } from "@/lib/customers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Une liste d’envies",
  description: "Une sélection de pièces Awrea Paris, partagée avec vous.",
  robots: { index: false, follow: false },
};

/** Liste d'envies partagée par une cliente (lien secret, révocable depuis son compte). */
export default async function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedWishlist(token);
  if (!shared) notFound();
  const products = await getProductsByHandles(shared.handles);
  const title = shared.firstName ? `Les envies de ${shared.firstName}` : "Une liste d’envies";
  return (
    <>
      <PageHeader title={title} crumbs={[{ name: "Liste d’envies partagée", path: `/liste-envies/partagee/${token}` }]} lead="Une sélection de pièces Awrea Paris, partagée avec vous. Pour faire plaisir, chaque pièce peut être offerte : message manuscrit, emballage de l’atelier et prix masqué sur le bordereau." />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container stack-l">
          {products.length ? (
            <ul className="shop-grid">
              {products.map((p) => (
                <li key={p.handle}>
                  <ProductCard product={p} sizes="(min-width: 64rem) 30vw, (min-width: 30rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-lead">Cette liste est vide pour le moment.</p>
          )}
          <div>
            <Link href="/offrir" className="btn">
              Offrir une pièce
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
