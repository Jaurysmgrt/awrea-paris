/**
 * SIGNATURE 5 — Pièces numérotées.
 * Chaque pièce affiche son numéro d'édition comme sur un certificat d'authenticité
 * (« N° 3 / 5 ») et le nombre de pièces restantes.
 */
import { editionInfo } from "@/lib/commerce/availability";
import type { Product } from "@/lib/commerce/types";

export function EditionNumber({ product, variant = "certificate" }: { product: Pick<Product, "edition" | "title" | "leadTimeWeeks">; variant?: "certificate" | "inline" }) {
  const ed = editionInfo(product);
  if (variant === "inline") {
    return (
      <span className="edition-inline t-label" title={ed.remainingLabel}>
        {ed.unique ? "Pièce unique" : ed.complete ? "Sur commande" : `N° ${ed.nextNumber} / ${ed.total}`}
      </span>
    );
  }
  return (
    <div className="certificate" role="group" aria-label="Certificat d’édition">
      <span className="certificate__corner" aria-hidden="true" />
      <p className="t-label certificate__head t-center">Certificat d’édition</p>
      <p className="certificate__number" aria-label={ed.unique ? "Pièce unique" : `Numéro ${ed.nextNumber} sur ${ed.total}`}>
        {ed.unique ? (
          <span className="certificate__unique">Pièce unique</span>
        ) : (
          <>
            <span className="certificate__no">N°</span>
            <span className="certificate__n">{ed.complete ? "—" : ed.nextNumber}</span>
            <span className="certificate__slash">/</span>
            <span className="certificate__total">{ed.total}</span>
          </>
        )}
      </p>
      <p className="t-note t-center certificate__remaining">
        {ed.complete
          ? product.leadTimeWeeks
            ? "La série est complète. Une nouvelle pièce peut être façonnée sur commande."
            : "La série est complète."
          : ed.remainingLabel}
      </p>
      <p className="t-label t-center certificate__foot">Fait main à Paris · Signé par la créatrice</p>
    </div>
  );
}
