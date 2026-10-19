import { getAllProducts, getCollections } from "@/lib/commerce";
import { LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";
import { imageAt } from "@/lib/media";
import { CatalogueForm } from "@/components/admin/CatalogueForm";
import { PieceEditor } from "@/components/admin/PieceEditor";

/**
 * Catalogue de l'Atelier. Chaque pièce est créée sur demande, sans stock : la créatrice règle ici
 * le prix, le délai de fabrication et les indicateurs « provisoire » et « nouveau » de chaque pièce,
 * et confie à l'agent Catalogue la fiche d'une nouvelle pièce.
 */
export default async function CataloguePage() {
  const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
  const prices = products.filter((p) => p.priceProvisional).map((p) => p.title);
  const delays = products.filter((p) => p.leadTimeProvisional).map((p) => p.title);
  // pièce Shopify sans aucune taille vendable : absente de la boutique tant que ce n'est pas réglé
  const unsellable = products.filter((p) => !p.variants.length).map((p) => p.title);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Catalogue</h1>
        <p className="t-lead">Chaque pièce est créée sur demande, sans stock. Réglez ici son prix et son délai de fabrication ; pour une nouvelle pièce, déposez ses photos et quelques notes, l’agent Catalogue rédige la fiche.</p>
      </header>

      <section className="panel" aria-labelledby="list-title">
        <h2 id="list-title" className="t-h3">Pièces en ligne ({products.length})</h2>
        {unsellable.length ? (
          <div className="notice stack-s">
            <p className="t-body">Hors de la boutique, aucune taille ne peut être vendue : {unsellable.join(", ")}.</p>
            <p className="t-note">Dans Shopify, pour chaque taille : décochez « Suivre la quantité », ou cochez « Continuer à vendre en cas de rupture de stock » (ACTIVATION.md, étape 4.2).</p>
          </div>
        ) : null}
        {prices.length || delays.length ? (
          <div className="notice stack-s">
            {prices.length ? <p className="t-body">Prix à confirmer : {prices.join(", ")}.</p> : null}
            {delays.length ? <p className="t-body">Délais de fabrication à confirmer : {delays.join(", ")}.</p> : null}
            <p className="t-note">Une fois confirmé, décochez « provisoire » sur la ligne de la pièce.</p>
          </div>
        ) : null}
        <div className="table-scroll">
          <table className="table catalogue-table">
            <thead>
              <tr>
                <th scope="col">Pièce et tailles</th>
                <th scope="col">Prix</th>
                <th scope="col">Délai de fabrication</th>
                <th scope="col">Pastille</th>
                <th scope="col">
                  <span className="sr-only">Enregistrer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <PieceEditor
                  key={p.handle}
                  bounds={LEAD_TIME_BOUNDS}
                  piece={{
                    handle: p.handle,
                    title: p.title,
                    image: imageAt(p.images[0]?.src ?? "", 480),
                    price: p.price,
                    priceVaries: Boolean(p.priceVaries),
                    priceProvisional: Boolean(p.priceProvisional),
                    leadTime: p.leadTime,
                    leadTimeProvisional: Boolean(p.leadTimeProvisional),
                    isNew: Boolean(p.isNew),
                    sizes: p.variants.map((v) => v.size),
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-note">Vos changements s’affichent aussitôt sur le site. Un changement de prix ou une suppression demandés par un agent attendent votre accord dans les Validations.</p>
      </section>

      <section className="panel" aria-labelledby="new-title">
        <h2 id="new-title" className="t-h3">Nouvelle pièce</h2>
        <CatalogueForm collections={collections.map((c) => ({ handle: c.handle, title: c.title }))} />
      </section>
    </div>
  );
}
