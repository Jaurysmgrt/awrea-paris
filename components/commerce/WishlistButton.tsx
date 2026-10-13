"use client";
import { useWishlist } from "./WishlistProvider";

/** Bouton « Garder » : un losange au fil, qui se remplit d'or. */
export function WishlistButton({ handle, title, variant = "text" }: { handle: string; title: string; variant?: "text" | "icon" }) {
  const { has, toggle } = useWishlist();
  const on = has(handle);
  return (
    <button
      type="button"
      className={`wish ${variant === "icon" ? "wish--icon" : "link link--quiet"}`}
      aria-pressed={on}
      aria-label={variant === "icon" ? `Garder ${title} dans ma liste d’envies` : undefined}
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
          <span>{on ? "Gardée" : "Garder"}</span>
          <span className="sr-only"> : {title}, liste d’envies</span>
        </>
      ) : null}
    </button>
  );
}
