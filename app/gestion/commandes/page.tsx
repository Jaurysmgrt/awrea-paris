/**
 * Commandes de l'Atelier : chaque pièce est créée sur demande. La créatrice fait avancer une
 * commande d'une étape en un geste (la cliente reçoit l'e-mail de l'étape), voit pour chacune la
 * fin de confection prévue d'après le délai annoncé, et, en tête, les commandes en retard sur ce
 * délai. Aucune liste d'attente : toutes les pièces se commandent toujours.
 */
import Link from "@/components/ui/Link";
import { getOrders, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { commerceMode } from "@/lib/commerce";
import { withStages } from "@/lib/store/order-stages";
import { nextStage, orderTimeline, type OrderTimeline } from "@/lib/customers/order-timeline";
import { formatDate, formatPrice } from "@/lib/format";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { atelierHref, atelierApi } from "@/lib/admin/path";
import type { Order } from "@/lib/commerce/types";
import { OrderStageControl } from "./_components/OrderStageControl";

export const dynamic = "force-dynamic";

/** Fin de confection prévue, en clair : « 2 novembre 2026 » ou « 26 octobre au 2 novembre 2026 ». */
function estimateText(t: OrderTimeline): string | null {
  if (!t.estimate) return null;
  const from = formatDate(t.estimate.from);
  const to = formatDate(t.estimate.to);
  return from === to ? `le ${to}` : `du ${from} au ${to}`;
}

/** Geste suivant d'une commande depuis la liste ; l'expédition s'ouvre sur la fiche (suivi, confirmation). */
function NextAction({ order }: { order: Order }) {
  const next = nextStage(order.status);
  if (!next || next === "paid") return null;
  if (next === "shipped" || next === "delivered") {
    if (commerceMode !== "demo") return <span className="t-note">Dans Shopify</span>;
    if (next === "shipped")
      return (
        <Link href={atelierHref(`/commandes/${encodeURIComponent(order.number)}#etapes`)} className="text-link">
          Expédier
        </Link>
      );
  }
  return <OrderStageControl number={order.number} next={next} compact />;
}

export default async function CommandesPage() {
  const orders = (await withStages(await getOrders())).slice(0, 60).map((o) => ({ order: o, timeline: orderTimeline(o) }));
  const late = orders.filter((x) => x.timeline.late);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Commandes</h1>
        <p className="t-lead">Chaque pièce est créée sur demande. Faites avancer une commande d’une étape en un geste, la cliente reçoit aussitôt l’e-mail de l’étape. Les commandes qui dépassent le délai annoncé sont signalées en tête.</p>
        <ActionButton endpoint={atelierApi("/agents/commandes-confection")} label="Lancer une vérification" busyLabel="Vérification…" />
      </header>

      <section className="panel" aria-labelledby="late-title">
        <h2 id="late-title" className="t-h3">
          En retard sur le délai annoncé ({late.length})
        </h2>
        {late.length ? (
          <ul className="stack">
            {late.map(({ order: o, timeline }) => (
              <li key={o.id} className="t-body">
                <Link href={atelierHref(`/commandes/${encodeURIComponent(o.number)}`)} className="text-link">
                  {o.number}
                </Link>{" "}
                · {o.name} · {statusLabel[o.status]} · fin prévue au plus tard le {timeline.estimate ? formatDate(timeline.estimate.to) : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-note">Toutes les confections tiennent leur délai.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="orders-title">
        <h2 id="orders-title" className="t-h3">Dernières commandes</h2>
        <div className="table-scroll">
          {/* six colonnes qui tiennent dans l'écran (capture de la créatrice du 01/11 : dix colonnes
              débordaient et écrasaient les pièces mot par mot) ; facture, certificats et suivi du
              transporteur sont sur la fiche de chaque commande */}
          <table className="table table--commandes">
            <thead>
              <tr>
                <th scope="col">Commande</th>
                <th scope="col">Cliente</th>
                <th scope="col">Pièces</th>
                <th scope="col">Total</th>
                <th scope="col">Étape</th>
                <th scope="col">À faire</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(({ order: o, timeline }) => {
                const url = trackingUrl(o.shipping.carrier, o.shipping.tracking);
                const estimate = estimateText(timeline);
                return (
                  <tr key={o.id} data-status={o.status} data-late={timeline.late || undefined}>
                    <th scope="row">
                      <Link href={atelierHref(`/commandes/${encodeURIComponent(o.number)}`)} className="text-link">
                        {o.number}
                      </Link>
                      <span className="t-note table__date">
                        <When iso={o.createdAt} />
                      </span>
                    </th>
                    <td>{o.name}<br /><span className="t-note table__mail">{o.email.split("@")[0]}<wbr />@{o.email.split("@").slice(1).join("@")}</span></td>
                    <td>{o.lines.map((l) => `${l.title} (${l.size})`).join(", ")}{o.gift?.wrap ? <><br /><span className="t-note">Cadeau : « {o.gift.message} »</span></> : null}</td>
                    <td className="table__nombre">{formatPrice(o.total)}</td>
                    <td>
                      <span className={`status status--${o.status === "blocked" ? "pending" : o.status === "delivered" || o.status === "shipped" ? "done" : "info"}`}>{statusLabel[o.status]}</span>
                      {timeline.late ? <> <span className="status status--pending">En retard</span></> : null}
                      <span className="t-note table__detail">{estimate ? `Fin prévue ${estimate}` : "Aucune fin prévue"}</span>
                      {url ? <a href={url} className="text-link t-note" target="_blank" rel="noopener noreferrer">Suivi {o.shipping.carrier}</a> : null}
                    </td>
                    <td>
                      <div className="table__gestes">
                        <NextAction order={o} />
                        <ActionButton endpoint={atelierApi("/avis/demande")} body={{ number: o.number }} label="Demander un avis" busyLabel="Envoi…" variant="quiet" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
