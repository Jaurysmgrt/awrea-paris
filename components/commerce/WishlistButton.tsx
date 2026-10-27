"use client";
import { useTexts } from "@/components/content/Texts";
import { fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { useWishlist } from "./WishlistProvider";

/**
 * Bouton « Garder » : un petit cœur au fil, qui se remplit à la couleur du texte (cahier des
 * modifications du 27/10 : le cœur remplace le losange). Textes du document « catalogue »,
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
        <path d="M8 13.5S2.25 10 2.25 5.9c0-1.85 1.35-3.15 3-3.15 1.2 0 2.2.65 2.75 1.65.55-1 1.55-1.65 2.75-1.65 1.65 0 3 1.3 3 3.15C13.75 10 8 13.5 8 13.5z" />
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
