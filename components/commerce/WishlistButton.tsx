"use client";
import { useTexts } from "@/components/content/Texts";
import { fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { useWishlist } from "./WishlistProvider";

/**
 * Bouton « Garder » : un losange au fil, qui se remplit d'or. Textes du document « catalogue »,
 * tournés pour suivre un titre à article (« Le body Aura », « La robe Odessa ») sans accord.
 */
export function WishlistButton({ handle, title, variant = "text" }: { handle: string; title: string; variant?: "text" | "icon" }) {
  const t = useTexts<CatalogueTexts>("catalogue").envies;
  const { has, toggle } = useWishlist();
  const on = has(handle);
  return (
    <button
      type="button"
      className={`wish ${variant === "icon" ? "wish--icon" : "link link--quiet"}`}
      aria-pressed={on}
      aria-label={variant === "icon" ? fill(t.carte, { piece: title }) : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(handle);
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="wish__mark">
        <path d="M8 1.5 14 8l-6 6.5L2 8z" />
      </svg>
      {variant === "text" ? (
        <>
          <span>{on ? t.gardee : t.garder}</span>
          <span className="sr-only"> {fill(t.fiche, { piece: title })}</span>
        </>
      ) : null}
    </button>
  );
}
