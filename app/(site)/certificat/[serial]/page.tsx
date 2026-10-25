import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import { CertificateActions } from "@/components/certificate/CertificateActions";
import { getCertificate, certificateQr, creatorWord, emailHash, toPublic } from "@/lib/certificates";
import { CertificateSheet, type CertificatTexts } from "@/components/certificate/CertificateSheet";
import { getCustomerSession } from "@/lib/auth/customer";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";

type Params = { params: Promise<{ serial: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { serial } = await params;
  const t = await getDoc<CertificatTexts>("certificat", "fr", { plain: true });
  return { title: { absolute: fill(t.page.titre, { serial: serial.toUpperCase() }) }, robots: { index: false, follow: false } };
}

/**
 * Certificat d'authenticité numérique : la page vers laquelle mène le QR code du certificat
 * papier. Elle atteste la pièce (numéro de création, date de confection, matières quand elles sont
 * connues) sans aucune donnée personnelle. Textes : document « certificat ».
 */
export default async function CertificatPage({ params }: Params) {
  const { serial } = await params;
  const c = await getCertificate(serial);
  if (!c) notFound();
  const [session, qr, t] = await Promise.all([getCustomerSession(), certificateQr(c.serial), getDoc<CertificatTexts>("certificat")]);
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
          <CertificateSheet c={toPublic(c)} qr={qr} word={creatorWord(c)} t={t} />
          <div className="no-print stack-s">
            <CertificateActions serial={c.serial} mine={mine} signedIn={Boolean(session)} t={t.actions} />
            <p className="t-note">
              <Link href={`/boutique/${c.productHandle}`} className="text-link">
                {t.page.voirPiece}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
