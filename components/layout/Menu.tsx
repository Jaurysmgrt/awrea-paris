"use client";
/**
 * Navigation du site, côté navigateur (maquette EN-TÊTE DU SITE).
 *
 * - HeaderBar : la barre de l'en-tête, rendue par Header.tsx qui lit le document « navigation ».
 *   Logo entier centré, puis les cinq entrées centrées en Cormorant : Accueil, Sur commande ⌄,
 *   Collections ⌄, Contact, Mon Panier ⌄. Les menus déroulants sont des boutons de divulgation
 *   (aria-expanded) : ouverture au clic, au clavier (Entrée, Espace), au survol en confort ;
 *   Échap, un clic ailleurs ou le focus qui s'en va les referment. Au défilement, l'en-tête
 *   devient compact : le monogramme et la même navigation (styles/layout.css).
 * - Menu : le menu plein écran du téléphone, un dialogue modal (<dialog>) qui reprend les cinq
 *   entrées et leurs sous-entrées.
 * - CookiesButton : « Gérer les cookies » du pied de page (rouvre les préférences).
 *
 * Aucun texte ici : entrées et liens dans content/site/fr/navigation.json, libellés de l'interface
 * dans content/site/fr/site.json (modifiables dans l'éditeur Édition).
 */
import Link from "@/components/ui/Link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Chevron } from "@/components/ui/Chevron";
import { Icon } from "@/components/ui/Icon";
import { DisplayPrefs } from "@/components/ui/DisplayPrefs";
import { useCart } from "@/components/commerce/CartProvider";
import { useWishlist } from "@/components/commerce/WishlistProvider";
import { useTexts } from "@/components/content/Texts";
import { loadSearchIndex } from "@/components/search/load";
import { fill } from "@/lib/edition/fill";
import { CONSENT_OPEN_EVENT } from "@/lib/consent";

const loadSearch = () => import("@/components/search/SearchOverlay");
const SearchOverlay = dynamic(loadSearch, { ssr: false });

/* ----------------------------------------------------------------- documents */

/** Rôle d'un lien qui n'est pas une simple adresse : ouvre la recherche, le panier, les cookies… */
export type NavType = "recherche" | "panier" | "envies" | "cookies" | "instagram";

export interface NavLink {
  label: string;
  href?: string;
  type?: NavType;
}

export interface NavEntry extends NavLink {
  sousMenu?: NavLink[];
}

/** content/site/fr/navigation.json */
export interface NavigationDoc {
  principal: NavEntry[];
  pied: { titre: string; liens: NavLink[] }[];
}

type SiteTexts = typeof import("@/content/site/fr/site.json");

/* ------------------------------------------------------------------- outils */

/** préchargement à l'intention : le code et l'index de la recherche arrivent pendant que la main approche */
function warmSearch() {
  void loadSearch();
  loadSearchIndex().catch(() => undefined);
}

const isCurrent = (pathname: string, href?: string) => (href ? (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)) : false);

type Lenis = { stop: () => void; start: () => void };
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;

/** « 2 pièces », « 0 pièce » */
function usePieces() {
  const t = useTexts<SiteTexts>("site").entete;
  return {
    /** nom accessible d'un bouton suivi de son compteur : « Mon Panier : 2 pièces » */
    nom: (libelle: string, n: number) => fill(t.compteur, { libelle, nombre: fill(n > 1 ? t.pieces.plusieurs : t.pieces.une, { n }) }),
  };
}

/** Compteur discret à côté d'un libellé (masqué aux lecteurs d'écran : le nom du bouton le dit). */
const Compteur = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="site-header__count" aria-hidden="true">
      {n}
    </span>
  ) : null;

interface Actions {
  pathname: string;
  panier: number;
  envies: number;
  onSearch: () => void;
  onCart: () => void;
  /** appelé après le choix d'une sous-entrée (refermer le menu) */
  onDone: () => void;
}

/** Une sous-entrée : lien, ou bouton qui ouvre la recherche ou le panier. */
function SousEntree({ item, a, className }: { item: NavLink; a: Actions; className: string }) {
  const pieces = usePieces();
  if (item.type === "recherche") {
    return (
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-keyshortcuts="/"
        onClick={() => {
          a.onDone();
          a.onSearch();
        }}
        onPointerEnter={warmSearch}
        onFocus={warmSearch}
      >
        {item.label}
      </button>
    );
  }
  if (item.type === "panier") {
    return (
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        aria-label={pieces.nom(item.label, a.panier)}
        onClick={() => {
          a.onDone();
          a.onCart();
        }}
      >
        {item.label}
        <Compteur n={a.panier} />
      </button>
    );
  }
  if (!item.href) return null;
  const envies = item.type === "envies";
  return (
    <Link href={item.href} className={className} aria-current={isCurrent(a.pathname, item.href) ? "page" : undefined} aria-label={envies ? pieces.nom(item.label, a.envies) : undefined} onClick={a.onDone}>
      {item.label}
      {envies ? <Compteur n={a.envies} /> : null}
    </Link>
  );
}

/* ------------------------------------------------------------- en-tête */

type Ouverture = { i: number; par: "clic" | "survol" } | null;

export function HeaderBar({ nav }: { nav: NavigationDoc }) {
  const t = useTexts<SiteTexts>("site").entete;
  const pieces = usePieces();
  const pathname = usePathname();
  const uid = useId();
  const { cart, open: openCart } = useCart();
  const { handles } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [compact, setCompact] = useState(false);
  const [ouvert, setOuvert] = useState<Ouverture>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const count = cart?.totalQuantity ?? 0;
  const subId = (i: number) => `${uid}-sous-menu-${i}`;

  const openSearch = useCallback(() => {
    setSearchMounted(true);
    setMenuOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const fermer = useCallback(() => setOuvert(null), []);

  // une nouvelle page referme le menu, la recherche et les menus déroulants (ajustement pendant le rendu)
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
    setOuvert(null);
  }

  // « / » ouvre la recherche, comme dans une application
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], dialog[open]")) return;
      e.preventDefault();
      setOuvert(null);
      openSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // compact dès que la partie haute (logo entier) a défilé : seule la bande de navigation reste
  useEffect(() => {
    const onScroll = () => {
      const seuil = topRef.current?.offsetHeight || bandRef.current?.offsetHeight || 0;
      setCompact(window.scrollY > seuil);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // menu déroulant ouvert : Échap le referme (le focus revient sur son bouton), un clic ailleurs aussi
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const bouton = navRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="${subId(ouvert.i)}"]`);
      setOuvert(null);
      if (navRef.current?.contains(document.activeElement)) bouton?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOuvert(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subId ne dépend que de l'identifiant stable
  }, [ouvert]);

  const actions: Actions = { pathname, panier: count, envies: handles.length, onSearch: openSearch, onCart: openCart, onDone: fermer };

  return (
    <>
      <header className="site-header" data-compact={compact} data-menu={menuOpen}>
        {/* partie haute (tablette et ordinateur) : le logo entier, centré ; inerte une fois compact */}
        <div ref={topRef} className="site-header__top" inert={compact}>
          <Link href="/" className="site-header__logo">
            <Logo decorative />
            <span className="sr-only">{t.accueil}</span>
          </Link>
        </div>

        <div ref={bandRef} className="site-header__band">
          <div className="site-header__inner container">
            <button type="button" className="site-header__menu link link--quiet" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(true)}>
              <span className="site-header__burger" aria-hidden="true" />
              {t.menu}
            </button>

            {/* téléphone : le logo au centre ; ordinateur : le monogramme, une fois compact */}
            <Link href="/" className="site-header__mark">
              <Logo className="site-header__mark-full" decorative />
              <Logo variant="monogram" className="site-header__mark-mini" decorative />
              <span className="sr-only">{t.accueil}</span>
            </Link>

            <nav ref={navRef} className="site-nav" aria-label={t.navigation}>
              <ul className="site-nav__list">
                {nav.principal.map((entry, i) => {
                  const open = ouvert?.i === i;
                  const panier = entry.type === "panier";
                  return (
                    <li
                      key={i}
                      className="site-nav__item"
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse" && entry.sousMenu && ouvert?.par !== "clic") setOuvert({ i, par: "survol" });
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") setOuvert((o) => (o?.i === i && o.par === "survol" ? null : o));
                      }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOuvert((o) => (o?.i === i ? null : o));
                      }}
                    >
                      {entry.sousMenu ? (
                        <>
                          <button
                            type="button"
                            className="site-nav__trigger link link--quiet"
                            aria-expanded={open}
                            aria-controls={subId(i)}
                            aria-label={panier ? pieces.nom(entry.label, count) : undefined}
                            data-current={entry.sousMenu.some((s) => isCurrent(pathname, s.href)) || undefined}
                            onClick={() => setOuvert((o) => (o?.i === i && o.par === "clic" ? null : { i, par: "clic" }))}
                          >
                            {entry.label}
                            {panier ? <Compteur n={count} /> : null}
                            <Chevron />
                          </button>
                          <ul id={subId(i)} className="site-nav__sub" data-open={open}>
                            {entry.sousMenu.map((s, j) => (
                              <li key={j}>
                                <SousEntree item={s} a={actions} className="link link--quiet" />
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : entry.href ? (
                        <Link href={entry.href} className="link link--quiet" aria-current={isCurrent(pathname, entry.href) ? "page" : undefined}>
                          {entry.label}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <button type="button" className="site-header__cart link link--quiet" aria-haspopup="dialog" aria-label={pieces.nom(t.panierCourt, count)} onClick={openCart}>
              {t.panierCourt}
              <Compteur n={count} />
            </button>
          </div>
        </div>
      </header>
      <Menu open={menuOpen} onClose={closeMenu} nav={nav} actions={{ ...actions, onDone: closeMenu }} />
      {searchMounted ? <SearchOverlay open={searchOpen} onClose={closeSearch} /> : null}
    </>
  );
}

/* --------------------------------------------------- menu plein écran */

/**
 * Menu plein écran du téléphone : dialogue modal natif (focus gardé dans le menu, Échap le
 * referme, le focus revient au bouton Menu). Les entrées à sous-menu se déplient sur place.
 */
export function Menu({ open, onClose, nav, actions }: { open: boolean; onClose: () => void; nav: NavigationDoc; actions: Actions }) {
  const t = useTexts<SiteTexts>("site");
  const ref = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [deplie, setDeplie] = useState<number | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal();
      document.documentElement.classList.add("is-locked");
      lenis()?.stop();
      d.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    } else {
      if (d.open) d.close();
      document.documentElement.classList.remove("is-locked");
      lenis()?.start();
    }
  }, [open]);

  // l'écran s'élargit (tablette tournée) : la navigation de l'en-tête prend le relais
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 48rem)");
    const onChange = () => mq.matches && onClose();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [onClose]);

  const entree = (entry: NavEntry, i: number): ReactNode => {
    if (!entry.sousMenu) {
      return entry.href ? (
        <Link href={entry.href} className="site-menu__entry" aria-current={isCurrent(actions.pathname, entry.href) ? "page" : undefined} onClick={onClose}>
          {entry.label}
        </Link>
      ) : null;
    }
    const id = `${uid}-sous-menu-${i}`;
    return (
      <>
        <button type="button" className="site-menu__entry" aria-expanded={deplie === i} aria-controls={id} onClick={() => setDeplie((d) => (d === i ? null : i))}>
          {entry.label}
          <Chevron />
        </button>
        <ul id={id} className="site-menu__sub" hidden={deplie !== i}>
          {entry.sousMenu.map((s, j) => (
            <li key={j}>
              <SousEntree item={s} a={actions} className="link link--quiet" />
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <dialog id="site-menu" ref={ref} className="site-menu" data-theme="ivory" data-open={open} aria-label={t.menu.titre} onClose={onClose}>
      <div className="site-menu__inner container">
        <div className="site-menu__bar">
          <button type="button" className="site-menu__close link link--quiet" onClick={onClose}>
            <Icon name="close" />
            {t.menu.fermer}
          </button>
          <Logo className="site-menu__logo" decorative />
        </div>
        <nav aria-label={t.entete.navigation} className="site-menu__nav">
          <ul className="site-menu__list">
            {nav.principal.map((entry, i) => (
              <li key={i} style={{ "--i": i } as CSSProperties}>
                {entree(entry, i)}
              </li>
            ))}
          </ul>
        </nav>
        <DisplayPrefs id="menu" className="site-menu__prefs" />
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------ pied de page */

/** « Gérer les cookies » : rouvre le gestionnaire de cookies (évènement de lib/consent). */
export function CookiesButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {label}
    </button>
  );
}
