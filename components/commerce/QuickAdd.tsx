"use client";
import Link from "@/components/ui/Link";
import { useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { Media } from "@/components/ui/Media";
import { Price } from "@/components/ui/Price";
import { useTexts } from "@/components/content/Texts";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { ProvisionalNote } from "./ProvisionalNote";

/** Ajout rapide d'une pièce (compléter le look, liste d'envies) : taille, délai de fabrication, panier. */
export function QuickAdd({ product, compact = false }: { product: Product; compact?: boolean }) {
  const t = useTexts<CatalogueTexts>("catalogue");
  const { dispatch, busy } = useCart();
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  return (
    <div className={`quick-add ${compact ? "quick-add--compact" : ""}`}>
      <Link href={`/boutique/${product.handle}`} className="quick-add__media">
        <Media image={product.images[0]} sizes="8rem" />
        <ProvisionalNote image={product.images[0]} />
      </Link>
      <div className="quick-add__body stack">
        <div>
          <Link href={`/boutique/${product.handle}`} className="t-body">
            {product.title}
          </Link>
          <div className="quick-add__meta">
            <Price amount={product.price} />
            <span className="t-note">{fill(t.surDemande.carte, { delai: delaiText(t, product.leadTime) })}</span>
          </div>
        </div>
        <SizePicker product={product} value={variant?.id ?? null} onChange={setVariant} />
        <button
          type="button"
          className="btn btn--block"
          disabled={!variant || busy}
          onClick={() => variant && dispatch({ type: "add", variantId: variant.id }, { openAfter: true, announce: fill(t.achat.annonce, { piece: product.title }) })}
        >
          {!variant ? t.achat.choisirUneTaille : t.achat.ajouter}
        </button>
      </div>
    </div>
  );
}
