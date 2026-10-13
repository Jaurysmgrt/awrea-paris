"use client";
import Link from "@/components/ui/Link";
import { useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { Media } from "@/components/ui/Media";
import { Price } from "@/components/ui/Price";
import { EditionNumber } from "@/components/signature/EditionNumber";
import { variantAvailability } from "@/lib/commerce/availability";

/** Ajout rapide d'une pièce (shop the look, compléter le look). */
export function QuickAdd({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { dispatch, busy } = useCart();
  const [variant, setVariant] = useState<Variant | null>(product.variants.length === 1 ? product.variants[0] : null);
  const a = variant ? variantAvailability(product, variant) : null;
  const soldout = a === "soldout";
  return (
    <div className={`quick-add ${compact ? "quick-add--compact" : ""}`}>
      <Link href={`/boutique/${product.handle}`} className="quick-add__media">
        <Media image={product.images[0]} sizes="8rem" />
      </Link>
      <div className="quick-add__body stack">
        <div>
          <Link href={`/boutique/${product.handle}`} className="t-h4">
            {product.title}
          </Link>
          <div className="quick-add__meta">
            <Price amount={product.price} />
            <EditionNumber product={product} variant="inline" />
          </div>
        </div>
        <SizePicker product={product} value={variant?.id ?? null} onChange={setVariant} />
        {soldout ? (
          <Link href={`/boutique/${product.handle}#liste-attente`} className="btn btn--block">
            Être prévenue
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn--block"
            disabled={!variant || busy}
            onClick={() => variant && dispatch({ type: "add", variantId: variant.id }, { openAfter: true, announce: `${product.title} ajoutée au panier` })}
          >
            {!variant ? "Choisir une taille" : a === "preorder" ? "Précommander" : "Ajouter au panier"}
          </button>
        )}
      </div>
    </div>
  );
}
