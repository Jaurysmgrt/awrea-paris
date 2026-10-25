import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { CertificateSheet, type CertificatTexts } from "@/components/certificate/CertificateSheet";
import { CertificateEditor } from "@/components/admin/CertificateEditor";
import { PrintButton } from "@/components/admin/PrintButton";
import { certificateQr, claimCodeOf, creatorWord, getCertificate, toPublic } from "@/lib/certificates";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { identity } from "@/content/brand/identity";
import { atelierHref } from "@/lib/admin/path";

/**
 * Préparer un certificat : le certificat papier (avec le code de rattachement) et l'étiquette à
 * coudre dans la pièce (QR code, numéro de création), sur une même feuille imprimable ; la date de confection et
 * le mot de la créatrice se corrigent ici.
 */
export default async function CertificatAtelierPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const c = await getCertificate(serial);
  if (!c) notFound();
  const [qr, t] = await Promise.all([certificateQr(c.serial), getDoc<CertificatTexts>("certificat", "fr", { plain: true })]);
  const code = claimCodeOf(c);
  const pub = toPublic(c);
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
        <p className="t-lead">Vérifiez la date de confection, posée le jour où la commande est prête, écrivez votre mot si vous le souhaitez, puis imprimez la feuille : le certificat à glisser dans le paquet, l’étiquette à coudre dans la pièce.</p>
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
        <CertificateSheet c={pub} qr={qr} word={creatorWord(c)} claimCode={code} t={t} />
        <div className="certificate-label" aria-label="Étiquette à coudre">
          <div className="certificate-label__qr" role="img" aria-label={fill(t.qr, { serial: c.serial })} dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="certificate-label__text">
            <p className="t-label">Awrea Paris</p>
            <p className="t-h4">{c.productTitle}</p>
            {pub.creation ? <p className="t-label">{fill(t.creation, { numero: pub.creation })}</p> : null}
            <p className="t-label">{c.serial}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
