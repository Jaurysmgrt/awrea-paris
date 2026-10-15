import type { Product } from "@/lib/commerce/types";
import { editionInfo } from "@/lib/commerce/availability";

/**
 * Fiche de traçabilité : où et comment la pièce a été faite, en combien de temps, d'où viennent
 * ses matières. Une origine encore inconnue est dite comme telle, jamais inventée.
 */
export function Traceability({ product }: { product: Product }) {
  const t = product.trace;
  if (!t) return null;
  const hours = t.steps.reduce((sum, s) => sum + (s.hours ?? 0), 0);
  const ed = editionInfo(product);
  return (
    <details className="disclosure">
      <summary>Traçabilité</summary>
      <div className="disclosure__body stack-m">
        <dl className="trace">
          <div className="trace__row">
            <dt className="t-label">Façonnée</dt>
            <dd>à la main, à Paris, dans l’atelier de la créatrice</dd>
          </div>
          {hours ? (
            <div className="trace__row">
              <dt className="t-label">Temps de fabrication</dt>
              <dd>environ {hours} heures par pièce</dd>
            </div>
          ) : null}
          <div className="trace__row">
            <dt className="t-label">Exemplaires</dt>
            <dd>{ed.unique ? "pièce unique" : `${ed.total} exemplaires numérotés, pas un de plus`}</dd>
          </div>
        </dl>
        {t.steps.length ? (
          <div className="stack-s">
            <h3 className="t-label">Les étapes</h3>
            <ol className="trace__list">
              {t.steps.map((s, i) => (
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
        {t.origins.length ? (
          <div className="stack-s">
            <h3 className="t-label">Les matières</h3>
            <ul className="trace__list">
              {t.origins.map((o) => (
                <li key={o.material} className="trace__item trace__item--plain">
                  <span>{o.material}</span>
                  <span className="t-soft">{o.origin ?? "origine précisée par l’atelier à la mise en vente"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
