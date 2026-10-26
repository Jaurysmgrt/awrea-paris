import type { Product } from "@/lib/commerce/types";
import { getDoc } from "@/lib/edition/read";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";

/**
 * Fabrication de la pièce : créée sur demande après la commande, par des artisans français, rien
 * n'étant fabriqué d'avance, dans un délai annoncé. Quand la Maison les renseigne (métachamp Shopify
 * `awrea.traceability`), les étapes et l'origine des matières s'ajoutent ; une origine encore
 * inconnue est dite comme telle, jamais inventée.
 */
export async function Traceability({ product }: { product: Product }) {
  const t = await getDoc<CatalogueTexts>("catalogue");
  const f = t.fabrication;
  const trace = product.trace;
  const rows = [
    { label: f.creation, value: f.creationTexte },
    { label: f.confection, value: f.confectionTexte },
    { label: f.delai, value: fill(f.delaiTexte, { delai: delaiText(t, product.leadTime) }) },
    { label: f.production, value: f.productionTexte },
  ];
  return (
    <details className="disclosure">
      <summary>{f.titre}</summary>
      <div className="disclosure__body stack-m">
        <dl className="trace">
          {rows.map((r) => (
            <div key={r.label} className="trace__row">
              <dt className="t-label">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        {trace?.steps.length ? (
          <div className="stack-s">
            <h3 className="t-label">{f.etapes}</h3>
            <ol className="trace__list">
              {trace.steps.map((s, i) => (
                <li key={s.label} className="trace__item">
                  <span className="trace__index" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s.label}</span>
                  <span className="t-soft">
                    {s.place}
                    {s.hours ? ` · ${s.hours} h` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {trace?.origins.length ? (
          <div className="stack-s">
            <h3 className="t-label">{f.matieres}</h3>
            <ul className="trace__list">
              {trace.origins.map((o) => (
                <li key={o.material} className="trace__item trace__item--plain">
                  <span>{o.material}</span>
                  <span className="t-soft">{o.origin ?? f.origineInconnue}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
