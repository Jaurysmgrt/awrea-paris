/**
 * Une commande dans l'Atelier : ses étapes (la frise telle que la cliente la voit, la fin de
 * confection prévue, le geste qui la fait avancer), cliente, adresse ou point relais, options
 * cadeau, pièces, taxes, et le bon de livraison à imprimer (sans les prix quand la pièce est offerte).
 */
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getOrder, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";
import { identity } from "@/content/brand/identity";
import { PrintButton } from "@/components/admin/PrintButton";
import { Logo } from "@/components/brand/Logo";
import { When } from "@/components/admin/Status";
import { OrderStages, type SuiviTexts } from "@/components/commerce/OrderStages";
import { commerceMode } from "@/lib/commerce";
import { atelierHref, atelierApi } from "@/lib/admin/path";
import { getDoc } from "@/lib/edition/read";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import { timelineOf } from "@/lib/store/order-stages";
import { nextStage } from "@/lib/customers/order-timeline";
import { OrderStageControl } from "../_components/OrderStageControl";

export const dynamic = "force-dynamic";

const countryName = (code: string) => shop.countries.find((c) => c.code === code)?.name ?? code;

export default async function CommandePage({ params }: { params: Promise<{ number: string }> }) {
  const found = await getOrder(decodeURIComponent((await params).number));
  if (!found) notFound();
  const [{ order, timeline }, suivi, catalogue] = await Promise.all([timelineOf(found), getDoc<SuiviTexts>("suivi-commande", "fr", { plain: true }), getDoc<CatalogueTexts>("catalogue", "fr", { plain: true })]);
  const next = nextStage(order.status);
  const viaShopify = commerceMode !== "demo" && (next === "shipped" || next === "delivered");
  const a = order.address;
  const hide = Boolean(order.gift?.wrap && order.gift.hidePrices !== false);
  const url = trackingUrl(order.shipping.carrier, order.shipping.tracking);
  const exp = order.taxes?.export;

  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head no-print">
        <p className="t-label">
          <Link href={atelierHref("/commandes")} className="text-link">
            Commandes
          </Link>
        </p>
        <h1 className="t-h1">Commande {order.number}</h1>
        <p className="t-lead">
          <When iso={order.createdAt} /> · {statusLabel[order.status]} · {formatPrice(order.total)}
        </p>
        <div className="admin-actions">
          <PrintButton label="Imprimer le bon de livraison" />
          <Link href={atelierApi(`/factures/${encodeURIComponent(order.number)}`)} className="btn" prefetch={false}>
            Facture
          </Link>
          <Link href={atelierHref(`/certificats?commande=${encodeURIComponent(order.number)}`)} className="btn">
            Certificats
          </Link>
        </div>
      </header>

      <section className="panel no-print stack" id="etapes" aria-labelledby="stages-title">
        <h2 id="stages-title" className="t-h3">
          Étapes de la commande
        </h2>
        <OrderStages timeline={timeline} t={suivi.frise} delai={timeline.leadTime ? delaiText(catalogue, timeline.leadTime) : null} />
        {timeline.late ? <p className="t-body"><span className="status status--failed">En retard</span> La confection dépasse le délai annoncé à la cliente. Un mot de votre part la rassurera.</p> : null}
        {next && next !== "paid" ? (
          viaShopify ? (
            <p className="t-note">L’expédition et la livraison se déclarent dans Shopify : le site suit seul, et la cliente reçoit l’e-mail de l’étape.</p>
          ) : (
            <OrderStageControl number={order.number} next={next} />
          )
        ) : (
          <p className="t-note">
            {order.status === "pending"
              ? "Le paiement n’est pas encore confirmé. La confection pourra commencer dès que Shopify le confirme."
              : order.status === "blocked"
                ? "Commande en attente de vérification. Elle reprend son cours une fois la vérification faite."
                : "Cette commande a franchi sa dernière étape."}
          </p>
        )}
      </section>

      <section className="panel no-print" aria-labelledby="client-title">
        <h2 id="client-title" className="t-h3">
          Cliente et livraison
        </h2>
        <dl className="admin-facts">
          <div>
            <dt className="t-label">Cliente</dt>
            <dd>
              {order.name} · {order.email}
            </dd>
          </div>
          <div>
            <dt className="t-label">Livraison</dt>
            <dd>
              {order.shipping.method}
              {order.shipping.relay ? ` · ${order.shipping.relay.name}, ${order.shipping.relay.address}` : ""}
              {order.shipping.pickup ? ", rendez-vous à fixer avec la cliente" : ""}
              {url ? (
                <>
                  {" "}
                  ·{" "}
                  <a href={url} className="text-link" target="_blank" rel="noopener noreferrer">
                    suivi {order.shipping.carrier}
                  </a>
                </>
              ) : null}
            </dd>
          </div>
          {a ? (
            <div>
              <dt className="t-label">Adresse</dt>
              <dd>
                {a.firstName} {a.lastName}, {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}, {a.postalCode} {a.city}, {countryName(a.country)}
                {a.phone ? ` · ${a.phone}` : ""}
              </dd>
            </div>
          ) : null}
          {order.gift?.wrap ? (
            <div>
              <dt className="t-label">Cadeau</dt>
              <dd>
                Emballage cadeau{order.gift.message ? `, avec le mot « ${order.gift.message} »` : ""}
                {hide ? " · prix masqués sur le bon" : ""}
                {order.gift.deliveryDate ? ` · à livrer le ${formatDate(order.gift.deliveryDate)}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="t-label">Paiement</dt>
            <dd>
              {order.paymentMethod}
              {exp ? ` · export : droits ${formatPrice(exp.duty)}, taxe du pays ${formatPrice(exp.importVat)}` : order.taxes ? ` · dont TVA ${formatPrice(order.taxes.vat)}` : ""}
            </dd>
          </div>
        </dl>
      </section>

      {/* bon de livraison : glissé dans le colis */}
      <article className="slip" aria-labelledby="slip-title">
        <header className="slip__head">
          <Logo className="slip__logo" />
          <div className="slip__ref">
            <h2 id="slip-title" className="t-label">
              Bon de livraison
            </h2>
            <p className="t-h3">{order.number}</p>
            <p className="t-note">{formatDate(order.createdAt)}</p>
          </div>
        </header>
        <div className="slip__address">
          <p className="t-label">Livré à</p>
          {order.shipping.relay ? (
            <p>
              {a ? `${a.firstName} ${a.lastName}` : order.name}
              <br />
              {order.shipping.relay.name}
              <br />
              {order.shipping.relay.address}
            </p>
          ) : order.shipping.pickup ? (
            <p>
              {a ? `${a.firstName} ${a.lastName}` : order.name}
              <br />
              Retrait à l’atelier, sur rendez-vous
            </p>
          ) : a ? (
            <p>
              {a.firstName} {a.lastName}
              <br />
              {a.line1}
              {a.line2 ? (
                <>
                  <br />
                  {a.line2}
                </>
              ) : null}
              <br />
              {a.postalCode} {a.city}
              <br />
              {countryName(a.country)}
            </p>
          ) : (
            <p>{order.name}</p>
          )}
        </div>
        <table className="table slip__lines">
          <thead>
            <tr>
              <th scope="col">Pièce</th>
              <th scope="col">Taille</th>
              {hide ? null : <th scope="col">Prix</th>}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={`${l.handle}-${i}`}>
                <th scope="row">{l.title}</th>
                <td>{l.size}</td>
                {hide ? null : <td>{formatPrice(l.unitPrice * l.quantity)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {order.gift?.wrap && order.gift.message ? <p className="slip__message">« {order.gift.message} »</p> : null}
        <p className="t-note slip__foot">
          {identity.name} · créée sur demande par des artisans français · {identity.email}
        </p>
      </article>
    </div>
  );
}
