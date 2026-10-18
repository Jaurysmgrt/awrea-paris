"use client";
import { useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { Price } from "@/components/ui/Price";
import { useTexts } from "@/components/content/Texts";
import { formatPrice } from "@/lib/format";
import { fill, type CatalogueTexts } from "@/lib/commerce/texts";

/**
 * Silhouette achetable en un geste : une taille par pièce, puis tout au panier. Les pièces sont
 * créées sur demande : toutes se commandent, la silhouette entière part quand la dernière est prête.
 */
export function OutfitAdd({ title, products }: { title: string; products: Product[] }) {
  const t = useTexts<CatalogueTexts>("catalogue");
  const { dispatch, busy } = useCart();
  const [sizes, setSizes] = useState<Record<string, Variant | undefined>>(() =>
    Object.fromEntries(products.map((p) => [p.handle, p.variants.length === 1 ? p.variants[0] : undefined])),
  );
  const pieces = products.filter((p) => p.variants.length > 0);
  const ready = pieces.length > 0 && pieces.every((p) => sizes[p.handle]);
  const total = pieces.reduce((s, p) => s + p.price, 0);

  return (
    <div className="outfit stack-m">
      <ul className="outfit__list">
        {pieces.map((p) => (
          <li key={p.handle} className="outfit__item">
            <div className="outfit__head">
              <span className="t-h4">{p.title}</span>
              <Price amount={p.price} />
            </div>
            <SizePicker product={p} value={sizes[p.handle]?.id ?? null} onChange={(v) => setSizes((s) => ({ ...s, [p.handle]: v }))} legend={fill(t.taille.legendePiece, { piece: p.title })} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn--solid btn--block"
        disabled={!ready || busy}
        onClick={() =>
          dispatch(
            { type: "addMany", variantIds: pieces.map((p) => sizes[p.handle]!.id) },
            { openAfter: true, announce: fill(t.silhouette.annonce, { titre: title }) },
          )
        }
      >
        {ready ? fill(t.silhouette.ajouter, { total: formatPrice(total) }) : t.silhouette.choisir}
      </button>
    </div>
  );
}
