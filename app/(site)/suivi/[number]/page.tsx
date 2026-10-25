/**
 * Suivi d'une commande sans compte, par lien signé (numéro et empreinte de l'e-mail : aucune
 * commande ne s'ouvre sans eux) : frise de la confection avec la date de chaque étape et la fin de
 * confection prévue, livraison, documents (facture, certificats et leur numéro de création), et
 * retour ou échange de taille en libre-service. Textes : documents « suivi-commande » et « certificat ».
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDoc } from "@/lib/edition/read";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "@/components/ui/Link";
import { OrderStages, type SuiviTexts } from "@/components/commerce/OrderStages";
import { orderFromAccess } from "@/lib/commerce/order-access";
import { statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { getProduct } from "@/lib/commerce";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { timelineOf } from "@/lib/store/order-stages";
import { isOrderStage } from "@/lib/customers/order-timeline";
import { formatDate, formatPrice } from "@/lib/format";
import { returnable, returnsOf, statusLabel as returnStatus, returnDeadline } from "@/lib/returns";
import { certificatesOfOrder } from "@/lib/certificates";
import { shop } from "@/content/settings";
import { ReturnForm, type ReturnableLine } from "@/components/orders/ReturnForm";

type CertificatTexts = typeof import("@/content/site/fr/certificat.json");

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDoc<SuiviTexts>("suivi-commande", "fr", { plain: true })).commande.seo;
  return pageMetadata({ title: t.title, description: t.description, path: "/suivi", noindex: true });
}
export const dynamic = "force-dynamic";

export default async function CommandeSuivie({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t: token }] = await Promise.all([params, searchParams]);
  const found = await orderFromAccess(decodeURIComponent(number), token);
  if (!found || !token) notFound();
  const [{ order, timeline }, returns, eligibility, certificates, suivi, catalogue, tc] = await Promise.all([
    timelineOf(found),
    returnsOf(found.number),
    returnable(found),
    certificatesOfOrder(found).catch(() => []),
    getDoc<SuiviTexts>("suivi-commande"),
    getDoc<CatalogueTexts>("catalogue"),
    getDoc<CertificatTexts>("certificat"),
  ]);
  const t = suivi.commande;
  const url = trackingUrl(order.shipping.carrier, order.shipping.tracking);
  const access = encodeURIComponent(token);
  const etape = isOrderStage(order.status) ? suivi.frise.etapes[order.status] : statusLabel[order.status];
  const lines: ReturnableLine[] = await Promise.all(
    eligibility.lines.map(async (l, index) => {
      const p = await getProduct(l.handle);
      // pièces créées sur demande : toutes les autres tailles se commandent
      const sizes = (p?.variants ?? []).filter((v) => v.size !== l.size).map((v) => v.size);
      return { index, title: l.title, size: l.size, price: formatPrice(l.unitPrice), sizes };
    }),
  );
  // mode de livraison (et point relais), puis le retrait à l'atelier et la date de remise souhaitée
  const delivery = [
    `${order.shipping.method}${order.shipping.relay ? ` · ${order.shipping.relay.name}, ${order.shipping.relay.address}` : ""}.`,
    order.shipping.pickup ? t.retrait : null,
    order.gift?.deliveryDate ? fill(t.remise, { date: formatDate(order.gift.deliveryDate) }) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <PageHeader title={fill(t.titre, { numero: order.number })} lead={fill(t.chapeau, { etape, date: formatDate(order.createdAt) })} crumbs={[{ name: suivi.recherche.titre, path: "/suivi" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">
          <section className="stack-s" aria-labelledby="confection">
            <h2 id="confection" className="t-h3">
              {t.confection}
            </h2>
            <OrderStages timeline={timeline} t={suivi.frise} delai={timeline.leadTime ? delaiText(catalogue, timeline.leadTime) : null} />
          </section>

          <section className="stack-s" aria-labelledby="livraison">
            <h2 id="livraison" className="t-h3">
              {t.livraison}
            </h2>
            <p className="t-body">{delivery}</p>
            {url ? (
              <p>
                <a href={url} className="link" target="_blank" rel="noopener noreferrer">
                  {fill(t.colis, { transporteur: order.shipping.carrier ?? "" })}
                </a>
              </p>
            ) : (
              <p className="t-note">{t.colisAVenir}</p>
            )}
          </section>

          <section className="stack-s" aria-labelledby="pieces">
            <h2 id="pieces" className="t-h3">
              {t.pieces}
            </h2>
            <ul className="stack-s">
              {order.lines.map((l, i) => (
                <li key={`${l.handle}-${i}`} className="confirmation__line">
                  <span className="t-body">{l.title}</span>
                  <span className="t-label t-soft">{fill(t.taille, { taille: l.size })}</span>
                  <span className="price">{formatPrice(l.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <p className="t-label">{fill(t.total, { total: formatPrice(order.total) })}</p>
          </section>

          <section className="stack-s" aria-labelledby="documents">
            <h2 id="documents" className="t-h3">
              {t.documents}
            </h2>
            <ul className="stack-s">
              {order.status !== "pending" ? (
                <li>
                  <a className="link" href={`/api/factures/${encodeURIComponent(order.number)}?t=${access}`}>
                    {t.facture}
                  </a>
                </li>
              ) : null}
              {certificates.map((c) => (
                <li key={c.serial}>
                  <Link className="link" href={`/certificat/${c.serial}`}>
                    {fill(t.certificat, { piece: c.productTitle })}
                    {c.creation ? ` · ${fill(tc.creation, { numero: c.creation })}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {returns.length ? (
            <section className="stack-s" aria-labelledby="retours">
              <h2 id="retours" className="t-h3">
                {t.retours}
              </h2>
              <ul className="stack-s">
                {returns.map((r) => (
                  <li key={r.id} className="stack-s">
                    <p className="t-body">
                      <span className="t-label">{r.id}</span> · {returnStatus[r.status]} ·{" "}
                      {r.items.map((i) => `${i.title} (${i.wish === "echange" ? fill(t.echange, { taille: i.exchangeSize ?? "" }) : t.remboursement})`).join(", ")}
                    </p>
                    {r.labelPending ? (
                      <p className="t-note">{t.etiquetteAVenir}</p>
                    ) : r.status === "demande" ? (
                      <p>
                        <a className="link" href={`/api/retours/${r.id}/etiquette?t=${access}`}>
                          {t.etiquette}
                        </a>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="stack-m" aria-labelledby="retourner">
            <h2 id="retourner" className="t-h3">
              {t.retourner}
            </h2>
            {eligibility.eligible ? (
              <>
                <p className="t-body">{fill(t.retourTexte, { date: formatDate(returnDeadline(order).toISOString()) })}</p>
                <ReturnForm number={order.number} token={token} lines={lines} returnDays={shop.returnDays} t={suivi.retour} />
              </>
            ) : (
              <p className="t-body">{eligibility.reason}</p>
            )}
          </section>
        </div>
      </Section>
    </>
  );
}
