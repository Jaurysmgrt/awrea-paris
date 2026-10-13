"use client";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/commerce/CartProvider";
import { useWishlist } from "@/components/commerce/WishlistProvider";
import { Menu } from "./Menu";

const left = [
  { href: "/boutique", label: "Boutique" },
  { href: "/collections", label: "Collections" },
  { href: "/silhouettes", label: "Silhouettes" },
];

export function Header() {
  const pathname = usePathname();
  const { cart, open: openCart } = useCart();
  const { handles } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);

  useEffect(() => setMenuOpen(false), [pathname]);

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
            <span className="sr-only">Awrea Paris — accueil</span>
          </Link>

          <div className="site-header__right">
            <Link href="/contact#rendez-vous" className="link link--quiet site-header__extra">
              Rendez-vous
            </Link>
            <Link href="/compte" className="link link--quiet site-header__extra">
              Compte
            </Link>
            <Link href="/liste-envies" className="link link--quiet site-header__extra">
              Envies
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
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
