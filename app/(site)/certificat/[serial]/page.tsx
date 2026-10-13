import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { CertificateActions } from "@/components/certificate/CertificateActions";
import { getCertificate, certificateQr, emailHash } from "@/lib/certificates";
import { getCustomerSession } from "@/lib/auth/customer";
import { formatDate } from "@/lib/format";

type Params = { params: Promise<{ serial: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { serial } = await params;
  return { title: { absolute: `Certificat ${serial.toUpperCase()} | Awrea Paris` }, robots: { index: false, follow: false } };
}

/**
 * Certificat d'authenticité numérique : la page vers laquelle mène le QR code du certificat
 * papier. Elle atteste la pièce (numéro d'édition, date, matières) sans aucune donnée personnelle.
 */
export default async function CertificatPage({ params }: Params) {
  const { serial } = await params;
  const c = await getCertificate(serial);
  if (!c) notFound();
  const [session, qr] = await Promise.all([getCustomerSession(), certificateQr(c.serial)]);
  const mine = Boolean(session && (c.customerId === session.id || c.ownerEmailHash === emailHash(session.email)));
  const unique = c.editionTotal === 1;
  const edition = unique ? "Pièce unique" : c.editionNumber ? `Numéro ${c.editionNumber} sur ${c.editionTotal}` : "Réalisée sur commande";

  return (
    <Section theme="paper" className="certificate-page">
      <div className="container certificate-page__grid">
        {c.image ? (
          <div className="certificate-page__media no-print">
            <Media image={{ src: c.image, alt: c.productTitle, width: 1200, height: 1800 }} sizes="(min-width: 64rem) 30vw, 80vw" priority />
          </div>
        ) : null}
        <div className="stack-l">
          <article className="certificate certificate--sheet" aria-labelledby="certificat-titre">
            <span className="certificate__corner" aria-hidden="true" />
            <p className="t-label certificate__head t-center">Certificat d’authenticité</p>
            <h1 id="certificat-titre" className="t-h1 t-center">
              {c.productTitle}
            </h1>
            <p className="certificate__number" aria-label={edition}>
              {c.editionNumber && !unique ? (
                <>
                  <span className="certificate__no">N°</span>
                  <span className="certificate__n">{c.editionNumber}</span>
                  <span className="certificate__slash">/</span>
                  <span className="certificate__total">{c.editionTotal}</span>
                </>
              ) : (
                <span className="certificate__unique">{edition}</span>
              )}
            </p>
            <dl className="certificate__facts">
              {c.collection ? (
                <div>
                  <dt className="t-label">Collection</dt>
                  <dd className="t-body">{c.collection}</dd>
                </div>
              ) : null}
              {c.size ? (
                <div>
                  <dt className="t-label">Taille</dt>
                  <dd className="t-body">{c.size}</dd>
                </div>
              ) : null}
              <div>
                <dt className="t-label">Matières</dt>
                <dd className="t-body">{c.materials}</dd>
              </div>
              <div>
                <dt className="t-label">Façonnée à Paris</dt>
                <dd className="t-body">{formatDate(c.madeOn)}</dd>
              </div>
            </dl>
            <p className="t-script certificate__signature">La créatrice</p>
            <div className="certificate__seal">
              <div className="certificate__qr" role="img" aria-label={`QR code du certificat ${c.serial}`} dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="t-label certificate__serial">{c.serial}</p>
            </div>
            <p className="t-label t-center certificate__foot">Fait main à Paris · Awrea Paris</p>
          </article>
          <div className="no-print stack-s">
            <CertificateActions serial={c.serial} mine={mine} signedIn={Boolean(session)} />
            <p className="t-note">
              <Link href={`/boutique/${c.productHandle}`} className="text-link">
                Voir la pièce
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
