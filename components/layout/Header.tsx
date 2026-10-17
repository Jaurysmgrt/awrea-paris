"use client";
/**
 * En-tête épuré : cinq entrées au plus (Menu, Boutique | Rechercher, Compte, Panier) ;
 * tout le reste vit dans le menu plein écran. Sur mobile : Menu | monogramme | Panier.
 */
import Link from "@/components/ui/Link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/commerce/CartProvider";
import { loadSearchIndex } from "@/components/search/load";
import { Menu } from "./Menu";

const loadSearch = () => import("@/components/search/SearchOverlay");
const SearchOverlay = dynamic(loadSearch, { ssr: false });

const left = [{ href: "/boutique", label: "Boutique" }];

/** préchargement à l'intention : le code et l'index arrivent pendant que la main approche */
function warmSearch() {
  void loadSearch();
  loadSearchIndex().catch(() => undefined);
}

export function Header() {
  const pathname = usePathname();
  const { cart, open: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  const openSearch = useCallback(() => {
    setSearchMounted(true);
    setMenuOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // une nouvelle page referme le menu et la recherche (ajustement pendant le rendu, sans effet)
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  // « / » ouvre la recherche, comme dans une application
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true'], dialog[open]")) return;
      e.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 240 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const count = cart?.totalQuantity ?? 0;

  return (
    <>
      <header className="site-header" data-hidden={hidden && !menuOpen} data-scrolled={scrolled} data-menu={menuOpen}>
        <div className="site-header__inner container">
          <div className="site-header__left">
            <button
              type="button"
              className="site-header__menu link link--quiet"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="site-header__burger" aria-hidden="true" />
              {menuOpen ? "Fermer" : "Menu"}
            </button>
            <nav aria-label="Navigation principale" className="site-header__nav">
              <ul>
                {left.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link link--quiet" aria-current={pathname.startsWith(l.href) ? "page" : undefined}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <Link href="/" className="site-header__logo">
            <Logo className="site-header__logo-svg" decorative />
            <span className="sr-only">Awrea Paris, page d’accueil</span>
          </Link>

          <div className="site-header__right">
            <button
              type="button"
              className="link link--quiet site-header__extra"
              aria-haspopup="dialog"
              aria-keyshortcuts="/"
              onClick={openSearch}
              onPointerEnter={warmSearch}
              onFocus={warmSearch}
            >
              Rechercher
            </button>
            <Link href="/compte" className="link link--quiet site-header__extra" aria-current={pathname.startsWith("/compte") ? "page" : undefined}>
              Compte
            </Link>
            <button type="button" className="link link--quiet" onClick={openCart} aria-haspopup="dialog">
              Panier
              <sup className="site-header__count" aria-hidden="true">
                {count}
              </sup>
              <span className="sr-only">
                {" "}
                : {count} pièce{count > 1 ? "s" : ""}
              </span>
            </button>
          </div>
        </div>
      </header>
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} onSearch={openSearch} />
      {searchMounted ? <SearchOverlay open={searchOpen} onClose={closeSearch} /> : null}
    </>
  );
}
