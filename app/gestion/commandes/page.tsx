import Link from "@/components/ui/Link";
import { getOrders, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { getWaitlist } from "@/lib/waitlist";
import { formatPrice } from "@/lib/format";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";

export default async function CommandesPage() {
  const [orders, waitlist] = await Promise.all([getOrders(), getWaitlist()]);
  const pendingWait = waitlist.filter((w) => !w.notifiedAt);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Commandes</h1>
        <p className="t-lead">L’agent Commandes et stock surveille les ventes, remet en stock les retours, signale les commandes bloquées et prévient la liste d’attente.</p>
        <ActionButton endpoint="/api/gestion/agents/commandes-stock" label="Lancer une vérification" busyLabel="Vérification…" />
      </header>
      <section className="panel" aria-labelledby="orders-title">
        <h2 id="orders-title" className="t-h3">Dernières commandes</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Commande</th>
                <th scope="col">Date</th>
                <th scope="col">Cliente</th>
                <th scope="col">Pièces</th>
                <th scope="col">Total</th>
                <th scope="col">Statut</th>
                <th scope="col">Suivi</th>
                <th scope="col">Certificats</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 60).map((o) => {
                const url = trackingUrl(o.shipping.carrier, o.shipping.tracking);
                return (
                  <tr key={o.id} data-status={o.status}>
                    <th scope="row">
                      <Link href={`/gestion/commandes/${encodeURIComponent(o.number)}`} className="text-link">
                        {o.number}
                      </Link>
                    </th>
                    <td><When iso={o.createdAt} /></td>
                    <td>{o.name}<br /><span className="t-note">{o.email}</span></td>
                    <td>{o.lines.map((l) => `${l.title} (${l.size}${l.editionLabel ? `, ${l.editionLabel}` : ""})`).join(", ")}{o.gift?.wrap ? <><br /><span className="t-note">Cadeau : « {o.gift.message} »</span></> : null}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td><span className={`status status--${o.status === "blocked" ? "failed" : o.status === "delivered" || o.status === "shipped" ? "done" : "info"}`}>{statusLabel[o.status]}</span></td>
                    <td>{url ? <a href={url} className="text-link" target="_blank" rel="noopener noreferrer">{o.shipping.carrier}</a> : "—"}</td>
                    <td>
                      <Link href={`/gestion/certificats?commande=${encodeURIComponent(o.number)}`} className="text-link">Préparer</Link>
                      <br />
                      <ActionButton endpoint="/api/gestion/avis/demande" body={{ number: o.number }} label="Demander un avis" busyLabel="Envoi…" variant="quiet" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" aria-labelledby="wait-title">
        <h2 id="wait-title" className="t-h3">Liste d’attente ({pendingWait.length})</h2>
        {pendingWait.length ? (
          <ul className="stack">
            {pendingWait.map((w, i) => (
              <li key={i} className="t-body">{w.email} — {w.handle}{w.size ? ` (${w.size})` : ""} · inscrite le {new Date(w.date).toLocaleDateString("fr-FR")}</li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Personne n’attend de pièce pour le moment.</p>
        )}
      </section>
    </div>
  );
}
