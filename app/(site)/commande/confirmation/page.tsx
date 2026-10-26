import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { pageMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/ui/Section";
import { Envelope } from "@/components/signature/Envelope";
import { verify } from "@/lib/auth/session";
import { getOrder, statusLabel } from "@/lib/commerce/orders";
import { formatPrice } from "@/lib/format";
import { getDoc } from "@/lib/edition/read";
import { getLocale } from "@/lib/i18n/server";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import { timelineOf } from "@/lib/store/order-stages";
import { OrderStages, type SuiviTexts } from "@/components/commerce/OrderStages";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";
import { AtelierNote, type CoulissesTexts } from "@/components/ui/AtelierNote";
import { certificatesOfOrder } from "@/lib/certificates";
import { orderAccessToken, orderLink } from "@/lib/commerce/order-access";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getDoc<CommerceTexts>("commerce", { plain: true })).confirmation;
  return pageMetadata({ title: t.seo.title, description: t.seo.description, path: "/commande/confirmation", noindex: true });
}
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const token = verify<{ n: string }>(sp.t);
  const order = token && token.n === sp.n ? await getOrder(token.n) : null;
  const first = order?.name.split(" ")[0];
  const certificates = order ? await certificatesOfOrder(order).catch(() => []) : [];
  // la suite de la commande : frise de la confection, délai et fin prévue, e-mails à chaque étape
  const [suite, suivi, catalogue, tc, commerce, coulisses] = await Promise.all([
    order ? timelineOf(order) : null,
    getDoc<SuiviTexts>("suivi-commande"),
    getDoc<CatalogueTexts>("catalogue"),
    getDoc<{ creation: string }>("certificat"),
    getDoc<CommerceTexts>("commerce"),
    getDoc<CoulissesTexts>("coulisses"),
  ]);
  const t = commerce.confirmation;

  return (
    <>
      <Section theme="paper" className="confirmation">
        {order ? (
          <PurchaseTracker
            number={order.number}
            value={order.total}
            items={order.lines.length}
          />
        ) : null}
        <div className="container-prose confirmation__inner">
          <Envelope
            greeting={first ? fill(t.salutationPrenom, { prenom: first }) : t.salutation}
            note={t.mot}
            signature={t.signature}
            reference={order ? fill(t.reference, { commande: order.number }) : undefined}
          />
          <div className="confirmation__details stack-m">
            <h1 className="t-h2 t-center">
              {first ? fill(t.titrePrenom, { prenom: first }) : t.titre}
            </h1>
            <p className="t-body t-center">
              {order ? fill(t.texteCommande, { commande: order.number, email: order.email }) : t.texte}
            </p>
            {order ? (
              <div className="notice stack">
                <p className="t-label">{statusLabel[order.status]}</p>
                <ul className="stack">
                  {order.lines.map((l, i) => (
                    <li key={i} className="confirmation__line">
                      <span className="t-body">{l.title}</span>
                      <span className="t-label t-soft">{fill(t.taille, { taille: l.size })}</span>
                      <span className="price">{formatPrice(l.unitPrice, locale)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="totals">
                  <div>
                    <dt>{fill(t.livraison, { mode: order.shipping.method })}</dt>
                    <dd>{order.shipping.price ? formatPrice(order.shipping.price, locale) : t.offerte}</dd>
                  </div>
                  <div className="totals__total">
                    <dt>{t.total}</dt>
                    <dd>{formatPrice(order.total, locale)}</dd>
                  </div>
                </dl>
                {suite ? (
                  <div className="stack-s">
                    <OrderStages timeline={suite.timeline} t={suivi.frise} delai={suite.timeline.leadTime ? delaiText(catalogue, suite.timeline.leadTime) : null} locale={locale} />
                    <p className="t-note">{suivi.confirmation.suite}</p>
                  </div>
                ) : null}
                {certificates.length ? (
                  <div className="stack-s confirmation__certificates">
                    <p className="t-label">
                      {certificates.length > 1 ? t.certificats : t.certificat}
                    </p>
                    <ul className="stack-s">
                      {certificates.map((c) => (
                        <li key={c.serial}>
                          <Link href={`/certificat/${c.serial}`} className="link">
                            {c.productTitle}
                            {c.creation ? `, ${fill(tc.creation, { numero: c.creation }).toLowerCase()}` : ""}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="confirmation__actions">
              <Link href={order ? orderLink(order) : "/suivi"} className="btn">
                {t.suivre}
              </Link>
              {order ? (
                <a href={`/api/factures/${encodeURIComponent(order.number)}?t=${encodeURIComponent(orderAccessToken(order))}`} className="link link--quiet">
                  {t.facture}
                </a>
              ) : null}
              <Link href="/boutique" className="link link--quiet">
                {t.continuer}
              </Link>
            </div>
          </div>
        </div>
      </Section>
      <AtelierNote t={coulisses} moment="finitions" theme="ivory" link={false} />
    </>
  );
}
