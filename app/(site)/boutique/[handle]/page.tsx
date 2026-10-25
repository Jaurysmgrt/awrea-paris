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
import { ViewTracker } from "@/components/commerce/ViewTracker";
import { shop } from "@/content/settings";
import { getDoc } from "@/lib/edition/read";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { DropGate, type DropInfo } from "@/components/drops/DropGate";
import { dropOfProduct } from "@/lib/drops";
import { Reviews } from "@/components/reviews/Reviews";
import { Traceability } from "@/components/commerce/Traceability";
import { ShareButton } from "@/components/commerce/ShareButton";
import s from "./fiche.module.css";

/**
 * Fiche d'une pièce, dans le langage de la maquette PAGE PRODUIT : photos aux angles arrondis
 * (avec la mention « visuel provisoire » des images générées), pastille « Nouveau », nom en
 * Cormorant (« Le body Aura »), prix « 70,00 € », délai de fabrication de la pièce créée sur
 * demande et lien vers la commande sur demande, guide des tailles. Aucune série, aucun stock.
 * Textes : documents « fiche-piece » (rubriques, liens) et « catalogue » (délai, sur demande).
 *
 * Livraison et retours : ce que disent les CGV officielles (livraison en France métropolitaine,
 * frais affichés avant la commande, retour sous 14 jours), sans promesse que la Maison n’a pas faite.
 */
type FicheTexts = typeof import("@/content/site/fr/fiche-piece.json");

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
  // textes du document « catalogue » : affichés (marques du mode Édition) et sans marques (données structurées)
  const [t, tPlain, tf] = await Promise.all([getDoc<CatalogueTexts>("catalogue"), getDoc<CatalogueTexts>("catalogue", undefined, { plain: true }), getDoc<FicheTexts>("fiche-piece")]);
  const delai = delaiText(t, product.leadTime);
  const reference = product.variants[0]?.sku.replace(/-[A-Z]+$/, "");

  return (
    <>
      <JsonLd data={productSchema(product, tPlain.delai)} />
      <ViewTracker handle={product.handle} title={product.title} price={product.price} collection={product.collection} />
      <Section theme="ivory" className="product">
        <div className="container product__grid">
          <div className={`product__gallery ${s.galerie}`}>
            <ProductGallery product={product} />
          </div>

          <div className="product__info">
            <div className="product__sticky stack-m">
              <Breadcrumbs items={[{ name: tf.filAriane, path: "/boutique" }, { name: product.title, path: `/boutique/${product.handle}` }]} />
              <header className={s.tete}>
                {collection ? (
                  <p className="eyebrow">
                    <Link href={`/collections/${collection.handle}`} className="link-plain">
                      {collection.title}
                    </Link>
                  </p>
                ) : null}
                {product.isNew ? (
                  <div>
                    <span className="badge">{t.nouveau}</span>
                  </div>
                ) : null}
                <div className={s.identite}>
                  <h1 className={s.nom}>{product.title}</h1>
                  <Price amount={product.price} className="product__price" />
                  <p className={`t-note t-left ${s.delai}`}>{fill(t.surDemande.carte, { delai })}</p>
                </div>
                <p className="t-lead">{product.tagline}</p>
              </header>

              <DropGate drop={dropInfo}>
                <ProductForm product={product} stickyBar />
              </DropGate>

              <div className={`notice ${s.surDemande}`}>
                <p className="t-note t-left">{t.surDemande.ethique}</p>
                <div className={s.liens}>
                  <Link href="/sur-commande" className="link">
                    {tf.surDemande.lien}
                  </Link>
                  <Link href="/guide-des-tailles" className="link">
                    {tf.surDemande.guide}
                  </Link>
                </div>
              </div>

              <div className="product__details">
                <details className="disclosure" open>
                  <summary>{tf.sections.piece}</summary>
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
                  <summary>{tf.sections.matieres}</summary>
                  <div className="disclosure__body prose">
                    {product.materials.length ? (
                      <ul>
                        {product.materials.map((m) => (
                          <li key={m.name}>
                            {m.percent} % {m.name.toLowerCase()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{t.matieresACompleter}</p>
                    )}
                    {product.lining ? <p>{product.lining}</p> : null}
                    <h3>{tf.sections.entretien}</h3>
                    <ul>
                      {product.care.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </details>
                <Traceability product={product} />
                <details className="disclosure">
                  <summary>{tf.sections.coupe}</summary>
                  <div className="disclosure__body prose">
                    <p>{product.fit}</p>
                    {product.model ? <p>{product.model}</p> : null}
                    <p>
                      {tf.mesures.avant}
                      <Link href="/guide-des-tailles">{tf.mesures.lien}</Link>
                      {tf.mesures.apres}
                    </p>
                    <p>
                      {tf.conseil.avant}
                      <Link href="/rendez-vous">{tf.conseil.lien}</Link>
                      {tf.conseil.apres}
                    </p>
                  </div>
                </details>
                <details className="disclosure">
                  <summary>{tf.sections.livraison}</summary>
                  <div className="disclosure__body prose">
                    <p>
                      {fill(t.surDemande.livraison, { delai })} {tf.livraison}
                    </p>
                    <p>
                      {fill(tf.retours, { jours: shop.returnDays })} <Link href="/livraison-retours">{tf.conditions}</Link>.
                    </p>
                  </div>
                </details>
              </div>
              <div className="product__foot">
                <p className="t-label t-soft">
                  {tf.categories[product.category]}
                  {reference ? <> · {fill(tf.reference, { ref: reference })}</> : null}
                </p>
                <ShareButton title={`${product.title}, Awrea Paris`} text={product.tagline} path={`/boutique/${product.handle}`} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section theme="ivory" className="section">
        <div className="container">
          <Reviews handle={product.handle} />
        </div>
      </Section>

      {look.length ? (
        <Section theme="pearl" className="section" labelledBy="look-title">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">{t.completer.surtitre}</p>
              <h2 id="look-title" className="t-h2">
                {t.completer.titre}
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
