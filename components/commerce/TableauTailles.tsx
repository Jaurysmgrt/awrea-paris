import { shop } from "@/content/settings";

/** Intitulés du tableau des tailles (document « catalogue », taille.tableau, traduit sous /en). */
export interface TableauTaillesTextes {
  colonnes: string[];
  courtes: string[];
  legende?: string;
}

/**
 * Tableau des tailles (mesures du corps : content/settings.ts, shop.sizeGuide), sur la fiche dans
 * « Trouver ma taille » et sur la page du guide. Intitulés tirés du document de contenu de la langue.
 * `empilee` (fenêtre de la fiche, étroite) : sur téléphone, chaque taille tient sur ses lignes, ses
 * mesures sous un intitulé court (`data-label`, styles/components.css), sans colonnes coupées ni
 * défilement en largeur.
 */
export function TableauTailles({ t, legendeClassName, empilee = false }: { t: TableauTaillesTextes; legendeClassName?: string; empilee?: boolean }) {
  const guide = shop.sizeGuide;
  return (
    <table className={empilee ? "table table--empilee" : "table"}>
      {t.legende ? <caption className={legendeClassName ?? "t-note"}>{t.legende}</caption> : null}
      <thead>
        <tr>
          {guide.headers.map((h, i) => (
            <th key={h} scope="col">
              {t.colonnes[i] ?? h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {guide.rows.map((r) => (
          <tr key={r[0]}>
            {r.map((c, i) =>
              i === 0 ? (
                <th key={i} scope="row">
                  {c}
                </th>
              ) : (
                <td key={i} data-label={t.courtes[i] ?? t.colonnes[i] ?? guide.headers[i]}>
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
