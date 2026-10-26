/**
 * La feuille du certificat d'authenticité : la même sur la page publique (/certificat/…) et dans
 * l'Atelier, où elle s'imprime avec le code de rattachement et l'étiquette à coudre (QR code).
 * Chaque pièce créée sur demande porte son numéro de création, unique (« Création n° 0001 ») ; le
 * code de vérification (serial) s'imprime sous le QR code. Textes : document « certificat ».
 */
import { fill } from "@/lib/edition/fill";
import { formatDate } from "@/lib/format";
import type { PublicCertificate } from "@/lib/certificates";
import type { Locale } from "@/lib/i18n/routing";

export type CertificatTexts = typeof import("@/content/site/fr/certificat.json");

export function CertificateSheet({ c, qr, word, claimCode, t, locale = "fr" }: { c: PublicCertificate; qr: string; word: string; claimCode?: string | null; t: CertificatTexts; locale?: Locale }) {
  const [no, numero] = c.creation ? fill(t.creation, { numero: "\u0000" }).split("\u0000") : [];
  return (
    <article className="certificate certificate--sheet" aria-labelledby={`certificat-${c.serial}`}>
      <span className="certificate__corner" aria-hidden="true" />
      <p className="t-label certificate__head t-center">{t.entete}</p>
      <h1 id={`certificat-${c.serial}`} className="t-h1 t-center">
        {c.productTitle}
      </h1>
      {c.creation ? (
        <p className="certificate__number">
          <span className="certificate__no">{no}</span>
          <span className="certificate__n">{c.creation}</span>
          {numero ? <span className="certificate__no">{numero}</span> : null}
        </p>
      ) : null}
      <dl className="certificate__facts">
        {c.collection ? (
          <div>
            <dt className="t-label">{t.faits.collection}</dt>
            <dd className="t-body">{c.collection}</dd>
          </div>
        ) : null}
        {c.size ? (
          <div>
            <dt className="t-label">{t.faits.taille}</dt>
            <dd className="t-body">{c.size}</dd>
          </div>
        ) : null}
        {/* composition inconnue tant que la Maison ne l'a pas donnée : rien n'est inventé */}
        {c.materials ? (
          <div>
            <dt className="t-label">{t.faits.matieres}</dt>
            <dd className="t-body">{c.materials}</dd>
          </div>
        ) : null}
        <div>
          <dt className="t-label">{t.faits.confection}</dt>
          <dd className="t-body">{formatDate(c.madeOn, locale)}</dd>
        </div>
      </dl>
      <figure className="certificate__word">
        <figcaption className="t-label">{t.mot}</figcaption>
        <blockquote>
          <p className="t-h4 t-center">« {word} »</p>
        </blockquote>
      </figure>
      <p className="t-h4 certificate__signature">{t.signature}</p>
      <div className="certificate__seal">
        <div className="certificate__qr" role="img" aria-label={fill(t.qr, { serial: c.serial })} dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="t-label certificate__serial">{c.serial}</p>
        {claimCode ? <p className="t-label certificate__claim">{fill(t.rattachement, { code: claimCode })}</p> : null}
      </div>
      <p className="t-label t-center certificate__foot">{t.pied}</p>
    </article>
  );
}
