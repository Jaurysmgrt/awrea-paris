import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { CertificateSheet } from "@/components/certificate/CertificateSheet";
import { CertificateEditor } from "@/components/admin/CertificateEditor";
import { PrintButton } from "@/components/admin/PrintButton";
import { certificateQr, claimCodeOf, creatorWord, getCertificate, toPublic } from "@/lib/certificates";
import { identity } from "@/content/brand/identity";
import { atelierHref } from "@/lib/admin/path";

/**
 * Préparer un certificat : le certificat papier (avec le code de rattachement) et l'étiquette à
 * coudre dans la pièce (QR code, numéro), sur une même feuille imprimable ; la date de fabrication et
 * le mot de la créatrice se corrigent ici.
 */
export default async function CertificatAtelierPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const c = await getCertificate(serial);
  if (!c) notFound();
  const qr = await certificateQr(c.serial);
  const code = claimCodeOf(c);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head no-print">
        <p className="t-note">
          <Link href={atelierHref("/certificats")} className="text-link">
            Certificats
          </Link>
          {c.orderNumber ? ` · commande ${c.orderNumber}` : ""}
        </p>
        <h1 className="t-h1">{c.serial}</h1>
        <p className="t-lead">Vérifiez la date de fabrication, écrivez votre mot si vous le souhaitez, puis imprimez la feuille : le certificat à glisser dans le paquet, l’étiquette à coudre dans la pièce.</p>
      </header>
      <section className="panel no-print" aria-labelledby="edit-title">
        <h2 id="edit-title" className="t-h3">Date et mot de la créatrice</h2>
        <CertificateEditor serial={c.serial} madeOn={c.madeOn} note={c.note ?? ""} defaultWord={identity.founderQuote} />
      </section>
      {code ? null : (
        <p className="t-note no-print">
          Le code de rattachement de ce certificat ne peut plus être relu (clé de chiffrement changée) : la cliente le retrouve dans son e-mail de commande.
        </p>
      )}
      <div className="no-print">
        <PrintButton />
      </div>
      <div className="certificate-print">
        <CertificateSheet c={toPublic(c)} qr={qr} word={creatorWord(c)} claimCode={code} />
        <div className="certificate-label" aria-label="Étiquette à coudre">
          <div className="certificate-label__qr" role="img" aria-label={`QR code du certificat ${c.serial}`} dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="certificate-label__text">
            <p className="t-label">Awrea Paris</p>
            <p className="t-h4">{c.productTitle}</p>
            <p className="t-label">{c.editionTotal === 1 ? "Pièce unique" : c.editionNumber ? `N° ${c.editionNumber} / ${c.editionTotal}` : "Sur commande"}</p>
            <p className="t-label">{c.serial}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
