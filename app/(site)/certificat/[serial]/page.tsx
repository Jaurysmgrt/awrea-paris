import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { CertificateActions } from "@/components/certificate/CertificateActions";
import { getCertificate, certificateQr, creatorWord, emailHash, toPublic } from "@/lib/certificates";
import { CertificateSheet } from "@/components/certificate/CertificateSheet";
import { getCustomerSession } from "@/lib/auth/customer";

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

  return (
    <Section theme="paper" className="certificate-page">
      <div className="container certificate-page__grid">
        {c.image ? (
          <div className="certificate-page__media no-print">
            <Media image={{ src: c.image, alt: c.productTitle, width: 1200, height: 1800 }} sizes="(min-width: 64rem) 30vw, 80vw" priority />
          </div>
        ) : null}
        <div className="stack-l">
          <CertificateSheet c={toPublic(c)} qr={qr} word={creatorWord(c)} />
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
