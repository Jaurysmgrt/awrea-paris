/**
 * SIGNATURE 5 — Certificat d'authenticité.
 * Chaque pièce est créée sur demande : plus de série ni de numéro d'édition (« N° 3 / 5 »). Elle
 * reçoit à la commande un numéro de création unique, inscrit sur son certificat d'authenticité
 * (lib/certificates.ts). Textes : document de contenu « catalogue », clé `certificat`.
 */
import { getDoc } from "@/lib/edition/read";
import type { CatalogueTexts } from "@/lib/commerce/texts";
import type { Product } from "@/lib/commerce/types";

export async function EditionNumber({ product, variant = "certificate" }: { product: Pick<Product, "title">; variant?: "certificate" | "inline" }) {
  const t = (await getDoc<CatalogueTexts>("catalogue")).certificat;
  if (variant === "inline") {
    return (
      <span className="edition-inline t-label" title={t.texte}>
        {t.numero}
      </span>
    );
  }
  return (
    <div className="certificate" role="group" aria-label={`${t.titre}, ${product.title}`}>
      <span className="certificate__corner" aria-hidden="true" />
      <p className="t-label certificate__head t-center">{t.titre}</p>
      <p className="certificate__number">
        <span className="certificate__unique">{t.numero}</span>
      </p>
      <p className="t-note t-center certificate__remaining">{t.texte}</p>
      <p className="t-label t-center certificate__foot">{t.pied}</p>
    </div>
  );
}
