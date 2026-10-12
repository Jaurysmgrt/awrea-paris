import Link from "next/link";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { editionInfo, productAvailability, availabilityLabel } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { imageAt } from "@/lib/media";
import { CatalogueForm } from "@/components/admin/CatalogueForm";
import { StockEditor } from "@/components/admin/StockEditor";

export default async function CataloguePage() {
  const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Catalogue</h1>
        <p className="t-lead">Déposez les photos d’une nouvelle pièce et quelques notes : l’agent Catalogue rédige la fiche dans le ton de la maison et la met en ligne.</p>
      </header>
      <section className="panel" aria-labelledby="new-title">
        <h2 id="new-title" className="t-h3">Nouvelle pièce</h2>
        <CatalogueForm collections={collections.map((c) => ({ handle: c.handle, title: c.title }))} />
      </section>
      <section className="panel" aria-labelledby="list-title">
        <h2 id="list-title" className="t-h3">Pièces en ligne ({products.length})</h2>
        <div className="table-scroll">
          <table className="table catalogue-table">
            <thead>
              <tr>
                <th scope="col">Pièce</th>
                <th scope="col">Prix</th>
                <th scope="col">Édition</th>
                <th scope="col">Stock par taille</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const ed = editionInfo(p);
                return (
                  <tr key={p.handle}>
                    <td>
                      <Link href={`/boutique/${p.handle}`} className="catalogue-table__piece">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageAt(p.images[0]?.src ?? "", 480)} alt="" width={40} height={60} />
                        <span>{p.title}</span>
                      </Link>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{ed.unique ? "Unique" : `${ed.produced} / ${ed.total}`}</td>
                    <td>
                      <span className="stock-row">
                        {p.variants.map((v) => (
                          <span key={v.id} className="stock-cell">
                            <span className="t-label">{v.size}</span>
                            <StockEditor handle={p.handle} size={v.size} quantity={v.quantity} />
                          </span>
                        ))}
                      </span>
                    </td>
                    <td>{availabilityLabel(productAvailability(p), p.leadTimeWeeks)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="t-note">Un changement de prix ou une suppression demandés par un agent apparaissent dans les Validations.</p>
      </section>
    </div>
  );
}
