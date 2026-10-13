import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getAllProducts, getCollection, getProduct, getProductsByHandles } from "@/lib/commerce";
import { pageMetadata } from "@/lib/seo/metadata";
import { productSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Section } from "@/components/ui/Section";
import { Price } from "@/components/ui/Price";
import { ProductGallery } from "@/components/commerce/ProductGallery";
import { ProductForm } from "@/components/commerce/ProductForm";
import { QuickAdd } from "@/components/commerce/QuickAdd";
import { EditionNumber } from "@/components/signature/EditionNumber";
import { ViewTracker } from "@/components/commerce/ViewTracker";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { AtelierNote } from "@/components/ui/AtelierNote";
import { momentFor } from "@/content/fr/coulisses";
import { DropGate, type DropInfo } from "@/components/drops/DropGate";
import { dropOfProduct } from "@/lib/drops";
import { Reviews } from "@/components/reviews/Reviews";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const p = await getProduct((await params).handle);
  if (!p) return {};
  // pièce d'un drop pas encore ouvert : pas d'indexation avant l'ouverture
  const drop = await dropOfProduct(p.handle);
  return pageMetadata({ ...p.seo, path: `/boutique/${p.handle}`, image: p.images[0]?.src, noindex: Boolean(drop) });
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const product = await getProduct((await params).handle);
  if (!product) notFound();
  const [collection, look, drop] = await Promise.all([getCollection(product.collection), getProductsByHandles(product.completeTheLook), dropOfProduct(product.handle)]);
  const dropInfo: DropInfo | null = drop ? { slug: drop.slug, title: drop.title, earlyAccessAt: drop.earlyAccessAt, publicAt: drop.publicAt, privateSale: drop.privateSale } : null;
  const categoryLabel = { robe: "Robe", body: "Body", top: "Top", jupe: "Jupe", accessoire: "Accessoire" }[product.category];

  return (
    <>
      <JsonLd data={productSchema(product)} />
      <ViewTracker handle={product.handle} title={product.title} price={product.price} collection={product.collection} />
      <Section theme="ivory" className="product">
        <div className="container product__grid">
          <div className="product__gallery">
            <ProductGallery product={product} />
          </div>

          <div className="product__info">
            <div className="product__sticky stack-m">
              <Breadcrumbs items={[{ name: "Boutique", path: "/boutique" }, { name: product.title, path: `/boutique/${product.handle}` }]} />
              <header className="stack">
                {collection ? (
                  <p className="eyebrow">
                    <Link href={`/collections/${collection.handle}`} className="link-plain">
                      {collection.title}
                    </Link>
                  </p>
                ) : null}
                <h1 className="t-h1">{product.title}</h1>
                <p className="t-lead">{product.tagline}</p>
                <Price amount={product.price} className="product__price" />
              </header>

              <EditionNumber product={product} />

              <DropGate drop={dropInfo}>
                <ProductForm product={product} />
              </DropGate>

              <p className="handmade t-label">
                <span aria-hidden="true" className="handmade__mark" />
                Fait main à Paris, dans l’atelier de la créatrice
              </p>

              <div className="product__details">
                <details className="disclosure" open>
                  <summary>La pièce</summary>
                  <div className="disclosure__body prose">
                    {product.description.map((d) => (
                      <p key={d}>{d}</p>
                    ))}
                    {product.details.length ? (
                      <ul>
                        {product.details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </details>
                <details className="disclosure">
                  <summary>Matières et entretien</summary>
                  <div className="disclosure__body prose">
                    <ul>
                      {product.materials.map((m) => (
                        <li key={m.name}>
                          {m.percent} % {m.name.toLowerCase()}
                        </li>
                      ))}
                    </ul>
                    {product.lining ? <p>{product.lining}</p> : null}
                    <h3>Entretien</h3>
                    <ul>
                      {product.care.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </details>
                <details className="disclosure">
                  <summary>Coupe et taille</summary>
                  <div className="disclosure__body prose">
                    <p>{product.fit}</p>
                    {product.model ? <p>{product.model}</p> : null}
                    <p>
                      Un doute ? <Link href="/contact#rendez-vous">Prenez rendez-vous pour un essayage</Link> à l’atelier, ou posez la question à notre assistante en bas de l’écran.
                    </p>
                  </div>
                </details>
                <details className="disclosure">
                  <summary>Livraison et retours</summary>
                  <div className="disclosure__body prose">
                    <p>
                      Expédition sous {shop.dispatchDays} pour les pièces disponibles{product.leadTimeWeeks ? `, ${product.leadTimeWeeks} semaines de fabrication pour les pièces sur commande` : ""}. Livraison offerte en France et en Europe dès{" "}
                      {formatPrice(shop.freeShippingThreshold)}.
                    </p>
                    <p>
                      Retours sous {shop.returnDays} jours, pièce non portée avec son certificat. <Link href="/livraison-retours">Toutes les conditions</Link>.
                    </p>
                  </div>
                </details>
              </div>
              <p className="t-label t-soft">
                {categoryLabel} · Réf. {product.variants[0]?.sku.replace(/-[A-Z]+$/, "")}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <AtelierNote moment={momentFor(product)} />

      <Section theme="ivory" className="section">
        <div className="container">
          <Reviews handle={product.handle} />
        </div>
      </Section>

      {look.length ? (
        <Section theme="pearl" className="section" labelledBy="look-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Compléter le look</p>
              <h2 id="look-title" className="t-h2">
                Avec {product.title}
              </h2>
            </header>
            <ul className="complete-look">
              {look.map((p) => (
                <li key={p.handle}>
                  <QuickAdd product={p} />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}
