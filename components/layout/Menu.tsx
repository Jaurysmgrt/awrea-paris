"use client";
import Link from "@/components/ui/Link";
import { useEffect, useRef } from "react";
import { nav } from "@/content/fr/pages";
import { identity } from "@/content/brand/identity";
import { roman } from "@/lib/format";
import { LightHalo } from "@/components/signature/LightHalo";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import { useWishlist } from "@/components/commerce/WishlistProvider";

/**
 * Menu plein écran, sur fond noir et dentelle révélée par un halo de lumière blanche.
 * Il accueille tout ce que l'en-tête, volontairement réduit à cinq entrées, ne montre pas.
 */
export function Menu({ open, onClose, onSearch }: { open: boolean; onClose: () => void; onSearch: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { handles } = useWishlist();

  useEffect(() => {
    const main = document.getElementById("contenu");
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (open) {
      main?.setAttribute("inert", "");
      footer?.setAttribute("inert", "");
      document.documentElement.classList.add("is-locked");
      (window as unknown as { __lenis?: { stop: () => void } }).__lenis?.stop();
      ref.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    } else {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      document.documentElement.classList.remove("is-locked");
      (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div id="site-menu" ref={ref} className="site-menu" data-theme="ink" data-open={open} aria-hidden={!open} inert={!open}>
      <LightHalo className="site-menu__light" active={open} />
      <div className="site-menu__inner container">
        <nav aria-label="Menu" className="site-menu__primary">
          <ol>
            {nav.primary.map((l, i) => (
              <li key={l.href} style={{ "--i": i } as React.CSSProperties}>
                <Link href={l.href} onClick={onClose}>
                  <span className="site-menu__num t-label">{roman(i + 1)}</span>
                  <span className="site-menu__label">{l.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className="site-menu__aside">
          <ul className="stack">
            <li>
              <button type="button" className="link link--quiet" aria-haspopup="dialog" onClick={onSearch}>
                Rechercher
              </button>
            </li>
            <li>
              <Link href="/liste-envies" className="link link--quiet" onClick={onClose}>
                Liste d’envies
                {handles.length ? (
                  <sup className="site-header__count" aria-hidden="true">
                    {handles.length}
                  </sup>
                ) : null}
                <span className="sr-only">
                  {" "}
                  : {handles.length} pièce{handles.length > 1 ? "s" : ""} gardée{handles.length > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
            {nav.secondary.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link link--quiet" onClick={onClose}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/compte" className="link link--quiet" onClick={onClose}>
                Mon compte
              </Link>
            </li>
            <li>
              <a href={identity.social.instagram} className="link link--quiet" target="_blank" rel="noopener noreferrer">
                Instagram {identity.social.instagramHandle}
              </a>
            </li>
          </ul>
          <DisplayPrefs id="menu" className="site-menu__prefs" />
          <p className="t-h3 site-menu__quote">{identity.tagline.replace(".", "")}</p>
        </div>
      </div>
    </div>
  );
}
