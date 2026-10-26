import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ProductCard } from "@/components/commerce/ProductCard";
import { getProductsByHandles } from "@/lib/commerce";
import { getSharedWishlist } from "@/lib/customers";

type ListeEnvies = typeof import("@/content/site/fr/liste-envies.json");

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<ListeEnvies>("liste-envies", { plain: true });
  return { title: { absolute: t.partagee.seo.title }, description: t.partagee.seo.description, robots: { index: false, follow: false } };
}

/** Liste d'envies partagée par une cliente (lien secret, révocable depuis son compte). */
export default async function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedWishlist(token);
  if (!shared) notFound();
  const [t, products] = await Promise.all([getDoc<ListeEnvies>("liste-envies"), getProductsByHandles(shared.handles)]);
  const p = t.partagee;
  const title = shared.firstName ? fill(p.titreAvecPrenom, { prenom: shared.firstName }) : p.titre;
  return (
    <>
      <PageHeader title={title} crumbs={[{ name: p.fil, path: `/liste-envies/partagee/${token}` }]} lead={p.chapeau} />
      <Section theme="ivory" className="section section--flush-top">
        <div className="container stack-l">
          {products.length ? (
            <ul className="shop-grid">
              {products.map((product) => (
                <li key={product.handle}>
                  <ProductCard product={product} sizes="(min-width: 64rem) 30vw, (min-width: 30rem) 50vw, 100vw" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-lead">{p.vide}</p>
          )}
          <div>
            <Link href={p.lien.href} className="btn">
              {p.lien.label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
