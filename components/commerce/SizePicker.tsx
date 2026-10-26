"use client";
import { useId } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import { useTexts } from "@/components/content/Texts";
import type { CatalogueTexts } from "@/lib/commerce/texts";

/**
 * Choix de la taille. Chaque pièce est créée sur demande : toutes les tailles proposées se
 * commandent, aucune n'est épuisée ni barrée.
 */
export function SizePicker({ product, value, onChange, legend }: { product: Pick<Product, "variants">; value: string | null; onChange: (v: Variant) => void; legend?: string }) {
  const t = useTexts<CatalogueTexts>("catalogue");
  const name = useId();
  return (
    <fieldset className="size-picker">
      <legend className="field__label">{legend ?? t.taille.legende}</legend>
      <div className="size-picker__options">
        {product.variants.map((v) => (
          <label key={v.id} className="chip">
            <input type="radio" name={name} value={v.id} checked={value === v.id} onChange={() => onChange(v)} />
            <span>{v.size === "TU" ? t.taille.unique : v.size}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
