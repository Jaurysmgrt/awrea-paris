import { silhouettes } from "@/content/fr/pages";
import { getLooks, getProductsByHandles } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { ShopTheLook } from "@/components/signature/ShopTheLook";
import { OutfitAdd } from "@/components/commerce/OutfitAdd";
import { roman } from "@/lib/format";

export const metadata = pageMetadata({ ...silhouettes.seo, path: "/silhouettes", image: "/media/img/look-1" });
export const revalidate = 300;

export default async function SilhouettesPage() {
  const looks = await getLooks();
  const withProducts = await Promise.all(looks.map(async (l) => ({ look: l, products: await getProductsByHandles(l.hotspots.map((h) => h.product)) })));
  return (
    <>
      <PageHeader title={silhouettes.h1} lead={silhouettes.lead} crumbs={[{ name: "Silhouettes", path: "/silhouettes" }]} script />
      {withProducts.map(({ look, products }, i) => (
        <Section key={look.handle} theme={i % 2 ? "pearl" : "ivory"} className="section--tall" labelledBy={`look-${look.handle}`} id={look.handle}>
          <div className={`container grid-12 silhouette ${i % 2 ? "silhouette--flip" : ""}`}>
            <div className="silhouette__stage" data-reveal>
              <ShopTheLook look={look} products={products} priority={i === 0} />
            </div>
            <div className="silhouette__text stack-m" data-reveal>
              <p className="eyebrow">Silhouette {roman(i + 1)}</p>
              <h2 id={`look-${look.handle}`} className="t-h2">
                {look.title}
              </h2>
              <p className="t-body">{look.note}</p>
              <OutfitAdd title={look.title} products={products} />
            </div>
          </div>
        </Section>
      ))}
    </>
  );
}
