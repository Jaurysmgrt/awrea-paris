import Link from "@/components/ui/Link";
import { pageMetadata } from "@/lib/seo/metadata";
import { Section } from "@/components/ui/Section";
import { Envelope } from "@/components/signature/Envelope";
import { verify } from "@/lib/auth/session";
import { getOrder, statusLabel } from "@/lib/commerce/orders";
import { formatPrice } from "@/lib/format";
import { shop } from "@/content/settings";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";
import { AtelierNote } from "@/components/ui/AtelierNote";
import { atelierMoments } from "@/content/fr/coulisses";
import { certificatesOfOrder } from "@/lib/certificates";
import { orderAccessToken, orderLink } from "@/lib/commerce/order-access";

export const metadata = pageMetadata({
  title: "Merci | Awrea Paris",
  description: "Votre commande Awrea Paris est confirmée.",
  path: "/commande/confirmation",
  noindex: true,
});
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; t?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const token = verify<{ n: string }>(sp.t);
  const order = token && token.n === sp.n ? await getOrder(token.n) : null;
  const first = order?.name.split(" ")[0];
  const certificates = order ? await certificatesOfOrder(order).catch(() => []) : [];

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
            greeting={first ? `Merci, ${first}.` : "Merci."}
            note="Votre pièce est désormais entre les mains de l’atelier. Nous la plierons dans du papier de soie, avec son certificat, et vous écrirons à son départ."
            reference={order ? `Commande ${order.number}` : undefined}
          />
          <div className="confirmation__details stack-m">
            <h1 className="t-h2 t-center">
              {first ? `Merci, ${first}` : "Merci pour votre commande"}
            </h1>
            <p className="t-body t-center">
              {order
                ? `Votre commande ${order.number} est confirmée. Un e-mail récapitulatif vient de vous être envoyé à ${order.email}.`
                : "Votre commande est confirmée. Un e-mail récapitulatif vient de vous être envoyé."}
            </p>
            {order ? (
              <div className="notice stack">
                <p className="t-label">{statusLabel[order.status]}</p>
                <ul className="stack">
                  {order.lines.map((l, i) => (
                    <li key={i} className="confirmation__line">
                      <span className="t-h4">{l.title}</span>
                      <span className="t-label t-soft">
                        Taille {l.size} · {l.editionLabel}
                      </span>
                      <span className="price">{formatPrice(l.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="totals">
                  <div>
                    <dt>Livraison · {order.shipping.method}</dt>
                    <dd>
                      {order.shipping.price
                        ? formatPrice(order.shipping.price)
                        : "Offerte"}
                    </dd>
                  </div>
                  <div className="totals__total">
                    <dt>Total</dt>
                    <dd>{formatPrice(order.total)}</dd>
                  </div>
                </dl>
                <p className="t-note">
                  {order.status === "in_production"
                    ? "Une partie de votre commande est en fabrication : nous vous écrirons à l’expédition, avec le lien de suivi."
                    : `Expédition sous ${shop.dispatchDays}. Vous recevrez le lien de suivi par e-mail.`}
                </p>
                {certificates.length ? (
                  <div className="stack-s confirmation__certificates">
                    <p className="t-label">
                      {certificates.length > 1 ? "Vos certificats d’authenticité" : "Votre certificat d’authenticité"}
                    </p>
                    <ul className="stack-s">
                      {certificates.map((c) => (
                        <li key={c.serial}>
                          <Link href={`/certificat/${c.serial}`} className="link">
                            {c.productTitle}
                            {c.editionTotal > 1 && c.editionNumber ? `, N° ${c.editionNumber} / ${c.editionTotal}` : ""}
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
                Suivre ma commande
              </Link>
              {order ? (
                <a href={`/api/factures/${encodeURIComponent(order.number)}?t=${encodeURIComponent(orderAccessToken(order))}`} className="link link--quiet">
                  Télécharger la facture
                </a>
              ) : null}
              <Link href="/boutique" className="link link--quiet">
                Continuer la visite
              </Link>
            </div>
          </div>
        </div>
      </Section>
      <AtelierNote
        moment={atelierMoments.finitions}
        theme="ivory"
        link={false}
      />
    </>
  );
}
