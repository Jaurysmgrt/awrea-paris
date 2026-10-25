import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { getLooks, getProductsByHandles } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ShopTheLook } from "@/components/signature/ShopTheLook";
import { OutfitAdd } from "@/components/commerce/OutfitAdd";
import { roman } from "@/lib/format";

type Outfits = typeof import("@/content/site/fr/outfits.json");

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDoc<Outfits>("outfits", "fr", { plain: true });
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/outfits" });
}

/**
 * Outfits : les tenues composées par la créatrice, venues du catalogue. Une tenue demande une vraie
 * photographie de plusieurs pièces portées ensemble : tant qu'aucune n'est publiée, la page mène
 * aux pièces de la collection.
 */
export default async function OutfitsPage() {
  const [t, looks] = await Promise.all([getDoc<Outfits>("outfits"), getLooks()]);
  const withProducts = await Promise.all(looks.map(async (l) => ({ look: l, products: await getProductsByHandles(l.hotspots.map((h) => h.product)) })));
  return (
    <>
      <PageHeader title={t.titre} lead={t.chapeau} crumbs={[{ name: t.titre, path: "/outfits" }]} />
      {withProducts.length ? (
        withProducts.map(({ look, products }, i) => (
          <Section key={look.handle} theme={i % 2 ? "pearl" : "ivory"} className="section--tall" labelledBy={`look-${look.handle}`} id={look.handle}>
            <div className={`container grid-12 silhouette ${i % 2 ? "silhouette--flip" : ""}`}>
              <div className="silhouette__stage" data-reveal>
                <ShopTheLook look={look} products={products} priority={i === 0} />
              </div>
              <div className="silhouette__text stack-m" data-reveal>
                <p className="eyebrow">{fill(t.silhouette, { numero: roman(i + 1) })}</p>
                <h2 id={`look-${look.handle}`} className="t-h2">
                  {look.title}
                </h2>
                <p className="t-body">{look.note}</p>
                <OutfitAdd title={look.title} products={products} />
              </div>
            </div>
          </Section>
        ))
      ) : (
        <Section theme="ivory" className="section section--flush-top">
          <div className="container-prose stack-m">
            <p className="t-body">{t.vide.texte}</p>
            <div>
              <Link href={t.vide.lien.href} className="btn">
                {t.vide.lien.label}
              </Link>
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
