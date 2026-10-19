/**
 * Suivi d'une commande sans compte, par lien signé : étapes, livraison, documents (facture,
 * étiquettes), certificats, et retour ou échange de taille en libre-service.
 */
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "@/components/ui/Link";
import { orderFromAccess } from "@/lib/commerce/order-access";
import { statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { getProduct } from "@/lib/commerce";
import { formatDate, formatPrice } from "@/lib/format";
import { returnable, returnsOf, statusLabel as returnStatus, returnDeadline } from "@/lib/returns";
import { certificatesOfOrder } from "@/lib/certificates";
import { shop } from "@/content/settings";
import { ReturnForm, type ReturnableLine } from "@/components/orders/ReturnForm";
import type { OrderStatus } from "@/lib/commerce/types";

export const metadata = pageMetadata({ title: "Votre commande | Awrea Paris", description: "Suivi de votre commande Awrea Paris.", path: "/suivi", noindex: true });
export const dynamic = "force-dynamic";

const STEPS: { status: OrderStatus[]; label: string }[] = [
  { status: ["paid", "pending", "blocked"], label: "Confirmée" },
  { status: ["in_production"], label: "À l’atelier" },
  { status: ["shipped"], label: "Expédiée" },
  { status: ["delivered", "returned", "refunded"], label: "Livrée" },
];

export default async function CommandeSuivie({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const order = await orderFromAccess(decodeURIComponent(number), t);
  if (!order || !t) notFound();
  const [returns, eligibility, certificates] = await Promise.all([returnsOf(order.number), returnable(order), certificatesOfOrder(order).catch(() => [])]);
  const step = STEPS.findIndex((s) => s.status.includes(order.status));
  const url = trackingUrl(order.shipping.carrier, order.shipping.tracking);
  const token = encodeURIComponent(t);
  const lines: ReturnableLine[] = await Promise.all(
    eligibility.lines.map(async (l, index) => {
      const p = await getProduct(l.handle);
      // pièces créées sur demande : toutes les autres tailles se commandent
      const sizes = (p?.variants ?? []).filter((v) => v.size !== l.size).map((v) => v.size);
      return { index, title: l.title, size: l.size, price: formatPrice(l.unitPrice), sizes };
    }),
  );

  return (
    <>
      <PageHeader title={`Commande ${order.number}`} lead={`${statusLabel[order.status]} · passée le ${formatDate(order.createdAt)}`} crumbs={[{ name: "Suivre une commande", path: "/suivi" }]} />
      <Section theme="ivory" className="section">
        <div className="container-prose stack-l">
          <ol className="order-steps" aria-label="Étapes de la commande">
            {STEPS.map((s, i) => (
              <li key={s.label} className="order-steps__step" data-done={i <= step} aria-current={i === step ? "step" : undefined}>
                <span className="t-label">{s.label}</span>
              </li>
            ))}
          </ol>

          <section className="stack-s" aria-labelledby="livraison">
            <h2 id="livraison" className="t-h3">
              Livraison
            </h2>
            <p className="t-body">
              {order.shipping.method}
              {order.shipping.relay ? ` · ${order.shipping.relay.name}, ${order.shipping.relay.address}` : ""}
              {order.shipping.pickup ? ". Nous vous écrivons pour choisir le jour avec vous" : ""}
              {order.gift?.deliveryDate ? `. Remise souhaitée le ${formatDate(order.gift.deliveryDate)}` : ""}
              .
            </p>
            {url ? (
              <p>
                <a href={url} className="link" target="_blank" rel="noopener noreferrer">
                  Suivre le colis ({order.shipping.carrier})
                </a>
              </p>
            ) : (
              <p className="t-note">Le lien de suivi du transporteur apparaîtra ici dès l’expédition.</p>
            )}
          </section>

          <section className="stack-s" aria-labelledby="pieces">
            <h2 id="pieces" className="t-h3">
              Pièces
            </h2>
            <ul className="stack-s">
              {order.lines.map((l, i) => (
                <li key={`${l.handle}-${i}`} className="confirmation__line">
                  <span className="t-h4">{l.title}</span>
                  <span className="t-label t-soft">
                    Taille {l.size}
                    {l.editionLabel ? ` · ${l.editionLabel}` : ""}
                  </span>
                  <span className="price">{formatPrice(l.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <p className="t-label">Total {formatPrice(order.total)}</p>
          </section>

          <section className="stack-s" aria-labelledby="documents">
            <h2 id="documents" className="t-h3">
              Documents
            </h2>
            <ul className="stack-s">
              {order.status !== "pending" ? (
                <li>
                  <a className="link" href={`/api/factures/${encodeURIComponent(order.number)}?t=${token}`}>
                    Facture (PDF)
                  </a>
                </li>
              ) : null}
              {certificates.map((c) => (
                <li key={c.serial}>
                  <Link className="link" href={`/certificat/${c.serial}`}>
                    Certificat d’authenticité · {c.productTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {returns.length ? (
            <section className="stack-s" aria-labelledby="retours">
              <h2 id="retours" className="t-h3">
                Vos retours
              </h2>
              <ul className="stack-s">
                {returns.map((r) => (
                  <li key={r.id} className="stack-s">
                    <p className="t-body">
                      <span className="t-label">{r.id}</span> · {returnStatus[r.status]} ·{" "}
                      {r.items.map((i) => `${i.title} (${i.wish === "echange" ? `échange en ${i.exchangeSize}` : "remboursement"})`).join(", ")}
                    </p>
                    {r.labelPending ? (
                      <p className="t-note">L’atelier vous envoie l’étiquette par e-mail dans la journée.</p>
                    ) : r.status === "demande" ? (
                      <p>
                        <a className="link" href={`/api/retours/${r.id}/etiquette?t=${token}`}>
                          Étiquette de retour (PDF)
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
              Retourner ou échanger une pièce
            </h2>
            {eligibility.eligible ? (
              <>
                <p className="t-body">
                  Jusqu’au {formatDate(returnDeadline(order).toISOString())}, une pièce non portée peut revenir à l’atelier : remboursement, ou une autre taille. Le retour est offert depuis la France.
                </p>
                <ReturnForm number={order.number} token={t} lines={lines} returnDays={shop.returnDays} />
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
