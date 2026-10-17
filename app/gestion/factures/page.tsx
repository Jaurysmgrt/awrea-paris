/**
 * Factures et avoirs : émis automatiquement au paiement et au remboursement, numérotés sans trou,
 * conservés dix ans ; export comptable par mois (envoyé aussi chaque 1er du mois).
 */
import { listInvoices, type Invoice } from "@/lib/invoices";
import { formatDate, formatMonth, formatPrice } from "@/lib/format";
import { vatFranchise } from "@/lib/commerce/international";
import { atelierApi } from "@/lib/admin/path";

export const dynamic = "force-dynamic";

export default async function FacturesPage() {
  const all = (await listInvoices()).sort((a, b) => b.number.localeCompare(a.number) || b.issuedAt.localeCompare(a.issuedAt));
  const months = [...new Set(all.map((i) => i.issuedAt.slice(0, 7)))].sort().reverse();
  const sum = (list: Invoice[], k: "ht" | "vat" | "ttc") => list.reduce((s, i) => s + (i.kind === "avoir" ? -1 : 1) * i.totals[k], 0);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Factures</h1>
        <p className="t-lead">Chaque paiement donne sa facture, chaque remboursement son avoir, numérotés dans l’ordre et conservés dix ans. L’export du mois part seul à la comptabilité le 1er.</p>
        {vatFranchise() ? <p className="t-note">Franchise en base de TVA : les factures portent la mention de l’article 293 B du CGI.</p> : null}
      </header>
      {months.length ? (
        months.map((m) => {
          const list = all.filter((i) => i.issuedAt.startsWith(m));
          return (
            <section key={m} className="panel" aria-labelledby={`m-${m}`}>
              <div className="admin-actions">
                <h2 id={`m-${m}`} className="t-h3">
                  {formatMonth(m)}
                </h2>
                <a href={atelierApi(`/factures/export?mois=${m}`)} className="btn">
                  Export comptable (CSV)
                </a>
              </div>
              <p className="t-note">
                {list.length} pièce(s) · {formatPrice(sum(list, "ht"))} hors taxes · TVA {formatPrice(sum(list, "vat"))} · {formatPrice(sum(list, "ttc"))} encaissés
              </p>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Numéro</th>
                      <th scope="col">Date</th>
                      <th scope="col">Commande</th>
                      <th scope="col">Cliente</th>
                      <th scope="col">Hors taxes</th>
                      <th scope="col">TVA</th>
                      <th scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((i) => (
                      <tr key={i.number}>
                        <th scope="row">
                          <a className="text-link" href={atelierApi(`/factures/${encodeURIComponent(i.orderNumber)}${i.kind === "avoir" ? "?avoir=1" : ""}`)} target="_blank" rel="noopener">
                            {i.number}
                          </a>
                          {i.kind === "avoir" ? <span className="t-note"> · avoir de {i.refOf}</span> : null}
                        </th>
                        <td>{formatDate(i.issuedAt)}</td>
                        <td>{i.orderNumber}</td>
                        <td>{i.buyer.name}</td>
                        <td>{formatPrice(i.totals.ht)}</td>
                        <td>{i.regime === "tva" ? formatPrice(i.totals.vat) : i.regime === "export" ? "exonérée" : "non applicable"}</td>
                        <td>{formatPrice(i.totals.ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      ) : (
        <section className="panel">
          <p className="t-body">Aucune facture pour l’instant : la première sera émise au premier paiement.</p>
        </section>
      )}
    </div>
  );
}
