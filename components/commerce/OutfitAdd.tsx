"use client";
import { useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useCart } from "./CartProvider";
import { SizePicker } from "./SizePicker";
import { Price } from "@/components/ui/Price";
import { formatPrice } from "@/lib/format";
import { variantAvailability } from "@/lib/commerce/availability";

/** Silhouette achetable en un geste : une taille par pièce, puis tout au panier. */
export function OutfitAdd({ title, products }: { title: string; products: Product[] }) {
  const { dispatch, busy } = useCart();
  const [sizes, setSizes] = useState<Record<string, Variant | undefined>>(() =>
    Object.fromEntries(products.map((p) => [p.handle, p.variants.length === 1 ? p.variants[0] : undefined])),
  );
  const purchasable = products.filter((p) => p.variants.some((v) => v.quantity > 0 || v.preorder));
  const ready = purchasable.every((p) => sizes[p.handle] && variantAvailability(p, sizes[p.handle]!) !== "soldout");
  const total = purchasable.reduce((s, p) => s + p.price, 0);

  return (
    <div className="outfit stack-m">
      <ul className="outfit__list">
        {products.map((p) => (
          <li key={p.handle} className="outfit__item">
            <div className="outfit__head">
              <span className="t-h4">{p.title}</span>
              <Price amount={p.price} />
            </div>
            {p.variants.some((v) => v.quantity > 0 || v.preorder) ? (
              <SizePicker product={p} value={sizes[p.handle]?.id ?? null} onChange={(v) => setSizes((s) => ({ ...s, [p.handle]: v }))} legend={`Taille · ${p.title}`} />
            ) : (
              <p className="t-note">Cette pièce est partie. Les autres s’ajoutent sans elle.</p>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn--solid btn--block"
        disabled={!ready || busy}
        onClick={() =>
          dispatch(
            { type: "addMany", variantIds: purchasable.map((p) => sizes[p.handle]!.id) },
            { openAfter: true, announce: `Silhouette ${title} ajoutée au panier` },
          )
        }
      >
        {ready ? `Ajouter la silhouette, ${formatPrice(total)}` : "Choisir une taille pour chaque pièce"}
      </button>
    </div>
  );
}
