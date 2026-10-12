"use client";
import { useId } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { variantAvailability } from "@/lib/commerce/availability";

/** Choix de la taille : stock par taille, tailles en précommande signalées, tailles épuisées barrées. */
export function SizePicker({ product, value, onChange, legend = "Taille" }: { product: Product; value: string | null; onChange: (v: Variant) => void; legend?: string }) {
  const name = useId();
  return (
    <fieldset className="size-picker">
      <legend className="field__label">{legend}</legend>
      <div className="size-picker__options">
        {product.variants.map((v) => {
          const a = variantAvailability(product, v);
          const label = a === "soldout" ? "épuisée" : a === "preorder" ? "sur commande" : a === "low" ? "dernière pièce" : "disponible";
          return (
            <label key={v.id} className="chip" data-unavailable={a === "soldout" || a === "preorder"} title={label}>
              <input type="radio" name={name} value={v.id} checked={value === v.id} onChange={() => onChange(v)} />
              <span>{v.size === "TU" ? "Taille unique" : v.size}</span>
              <span className="sr-only">, {label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
