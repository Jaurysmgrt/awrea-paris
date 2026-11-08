/**
 * Commandes de l'Atelier : chaque pièce est créée sur demande. La créatrice fait avancer une
 * commande d'une étape en un geste (la cliente reçoit l'e-mail de l'étape), voit pour chacune la
 * fin de confection prévue d'après le délai annoncé, et, en tête, les commandes en retard sur ce
 * délai. Aucune liste d'attente : toutes les pièces se commandent toujours.
 */
import Link from "@/components/ui/Link";
import { getOrdersWithSource, SHOPIFY_ORDERS_LIMIT, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { adminEnabled } from "@/lib/shopify/admin";
import { commerceMode } from "@/lib/commerce";
import { withStages } from "@/lib/store/order-stages";
import { nextStage, orderTimeline, type OrderTimeline } from "@/lib/customers/order-timeline";
import { formatDate, formatPrice } from "@/lib/format";
import { ActionButton } from "@/components/admin/ActionButton";
import { When } from "@/components/admin/Status";
import { atelierHref, atelierApi } from "@/lib/admin/path";
import type { Order } from "@/lib/commerce/types";
import { OrderStageControl } from "./_components/OrderStageControl";
import { compterParEtape, estEtape, estPeriode, ETAPES_FILTRE, filtrerCommandes, PERIODES, type FiltreEtape, type Periode } from "@/lib/admin/commandes";

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

const AFFICHEES = 100;

export default async function CommandesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; etape?: string | string[]; periode?: string | string[] }> }) {
  const sp = await searchParams;
  // une seule valeur texte (?q=a&q=b donne un tableau)
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 80);
  const etape: FiltreEtape = estEtape(sp.etape) ? sp.etape : "toutes";
  const periode: Periode = estPeriode(sp.periode) ? sp.periode : "tout";
  const { orders: lues, source } = await getOrdersWithSource();
  const toutes = await withStages(lues);
  const maintenant = new Date();
  // les compteurs des étapes suivent la recherche et la période ; la liste suit aussi l'étape
  const cherchees = filtrerCommandes(toutes, { q, periode }, maintenant);
  const compte = compterParEtape(cherchees);
  const trouvees = filtrerCommandes(cherchees, { etape }, maintenant);
  const orders = trouvees.slice(0, AFFICHEES).map((o) => ({ order: o, timeline: orderTimeline(o) }));
  const late = toutes.map((o) => ({ order: o, timeline: orderTimeline(o) })).filter((x) => x.timeline.late);
  const lien = (e: FiltreEtape) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(e !== "toutes" ? { etape: e } : {}), ...(periode !== "tout" ? { periode } : {}) }).toString();
    return atelierHref(`/commandes${p ? `?${p}` : ""}`);
  };
  const filtre = Boolean(q || etape !== "toutes" || periode !== "tout");
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Commandes</h1>
        <p className="t-lead">Un geste fait avancer une commande, et la cliente reçoit l’e-mail de l’étape.</p>
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

      <section className="panel stack-m" aria-labelledby="orders-title">
        <h2 id="orders-title" className="t-h3">
          {filtre ? `Commandes trouvées (${trouvees.length})` : "Dernières commandes"}
        </h2>
        <form className="commandes-filtres" role="search" method="get" action={atelierHref("/commandes")}>
          <div className="field">
            <label className="field__label" htmlFor="commandes-q">
              Chercher une commande
            </label>
            <input id="commandes-q" name="q" type="search" className="field__input" defaultValue={q} placeholder="Numéro, nom, adresse ou pièce" autoComplete="off" />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="commandes-periode">
              Période
            </label>
            <select id="commandes-periode" name="periode" className="field__input" defaultValue={periode}>
              {PERIODES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {etape !== "toutes" ? <input type="hidden" name="etape" value={etape} /> : null}
          <button type="submit" className="btn btn--outline">
            Chercher
          </button>
        </form>
        <nav className="produits__filtres" aria-label="Étapes des commandes">
          {ETAPES_FILTRE.map((e) => (
            <Link key={e.id} href={lien(e.id)} className="chip" aria-current={e.id === etape ? "true" : undefined}>
              {e.label} ({compte[e.id]})
            </Link>
          ))}
        </nav>
        {filtre ? (
          <p className="t-note">
            <Link href={atelierHref("/commandes")} className="text-link">
              Effacer la recherche et les filtres
            </Link>
          </p>
        ) : null}
        {adminEnabled && source === "demo" ? <p className="notice t-body">Shopify ne répond pas : ces commandes sont des exemples de démonstration, pas les vôtres. Aucun geste d’argent n’est possible avant son retour.</p> : null}
        {source === "shopify" && lues.length >= SHOPIFY_ORDERS_LIMIT ? <p className="t-note">Les {SHOPIFY_ORDERS_LIMIT} commandes les plus récentes sont chargées : une commande plus ancienne se retrouve dans Shopify.</p> : null}
        {trouvees.length > AFFICHEES ? <p className="t-note">Les {AFFICHEES} plus récentes sont affichées : affinez la recherche pour trouver les autres.</p> : null}
        {!orders.length ? (
          <p className="t-body">{toutes.length ? "Aucune commande ne correspond. Essayez un autre mot, une autre étape ou une autre période." : "Aucune commande pour l’instant."}</p>
        ) : (
        <div className="table-scroll">
          {/* six colonnes qui tiennent dans l'écran (capture de la créatrice du 01/11 : dix colonnes
              débordaient et écrasaient les pièces mot par mot) ; facture, certificats et suivi du
              transporteur sont sur la fiche de chaque commande */}
          <table className="table table--commandes" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">Commande</th>
                <th scope="col" role="columnheader">Cliente</th>
                <th scope="col" role="columnheader">Pièces</th>
                <th scope="col" role="columnheader">Total</th>
                <th scope="col" role="columnheader">Étape</th>
                <th scope="col" role="columnheader">À faire</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {orders.map(({ order: o, timeline }) => {
                const url = trackingUrl(o.shipping.carrier, o.shipping.tracking);
                const estimate = estimateText(timeline);
                return (
                  <tr role="row" key={o.id} data-status={o.status} data-late={timeline.late || undefined}>
                    <th scope="row" role="rowheader">
                      <Link href={atelierHref(`/commandes/${encodeURIComponent(o.number)}`)} className="text-link">
                        {o.number}
                      </Link>
                      <span className="t-note table__date">
                        <When iso={o.createdAt} />
                      </span>
                    </th>
                    <td role="cell" data-titre="Cliente">{o.name}<br /><span className="t-note table__mail">{o.email.split("@")[0]}<wbr />@{o.email.split("@").slice(1).join("@")}</span></td>
                    <td role="cell" data-titre="Pièces">{o.lines.map((l) => `${l.title} (${l.size})`).join(", ")}{o.gift?.wrap ? <><br /><span className="t-note">Cadeau : « {o.gift.message} »</span></> : null}</td>
                    <td role="cell" className="table__nombre" data-titre="Total">{formatPrice(o.total)}</td>
                    <td role="cell" data-titre="Étape">
                      <span className={`status status--${o.status === "blocked" ? "pending" : o.status === "delivered" || o.status === "shipped" ? "done" : "info"}`}>{statusLabel[o.status]}</span>
                      {timeline.late ? <> <span className="status status--pending">En retard</span></> : null}
                      <span className="t-note table__detail">{estimate ? `Fin prévue ${estimate}` : "Aucune fin prévue"}</span>
                      {url ? <a href={url} className="text-link t-note" target="_blank" rel="noopener noreferrer">Suivi {o.shipping.carrier}</a> : null}
                    </td>
                    <td role="cell" data-titre="À faire">
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
        )}
      </section>
    </div>
  );
}
