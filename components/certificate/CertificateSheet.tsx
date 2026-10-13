/**
 * La feuille du certificat d'authenticité : la même sur la page publique (/certificat/…) et dans
 * l'Atelier, où elle s'imprime avec le code de rattachement et l'étiquette à coudre (QR code).
 */
import { formatDate } from "@/lib/format";
import type { PublicCertificate } from "@/lib/certificates";

export function CertificateSheet({ c, qr, word, claimCode }: { c: PublicCertificate; qr: string; word: string; claimCode?: string | null }) {
  const unique = c.editionTotal === 1;
  const edition = unique ? "Pièce unique" : c.editionNumber ? `Numéro ${c.editionNumber} sur ${c.editionTotal}` : "Réalisée sur commande";
  return (
    <article className="certificate certificate--sheet" aria-labelledby={`certificat-${c.serial}`}>
      <span className="certificate__corner" aria-hidden="true" />
      <p className="t-label certificate__head t-center">Certificat d’authenticité</p>
      <h1 id={`certificat-${c.serial}`} className="t-h1 t-center">
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
      <figure className="certificate__word">
        <figcaption className="t-label">Le mot de la créatrice</figcaption>
        <blockquote>
          <p className="t-h4 t-center">« {word} »</p>
        </blockquote>
      </figure>
      <p className="t-h4 certificate__signature">La créatrice</p>
      <div className="certificate__seal">
        <div className="certificate__qr" role="img" aria-label={`QR code du certificat ${c.serial}`} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="t-label certificate__serial">{c.serial}</p>
        {claimCode ? <p className="t-label certificate__claim">Code de rattachement : {claimCode}</p> : null}
      </div>
      <p className="t-label t-center certificate__foot">Fait main à Paris · Awrea Paris</p>
    </article>
  );
}
