"use client";
/**
 * En-tête « atelier » : le logo à gauche, cinq entrées nommées avec les mots de la Maison, et
 * sous la barre un mètre ruban (un trait par 8 px, la grille du site rendue visible).
 * Aucun pictogramme, aucune transparence sur image : il tient seul sur le papier.
 * Sur téléphone, les quatre rubriques se déplient sous la barre ; le panier reste visible.
 */
import { useState } from "react";
import Link from "@/components/ui/Link";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/commerce/CartProvider";
import { commun } from "./textes";
import styles from "../da-atelier.module.css";

const T = commun.entete;

export function AtelierHeader({ contentId }: { contentId: string }) {
  const { cart, open } = useCart();
  const [menu, setMenu] = useState(false);
  const count = cart?.totalQuantity ?? 0;

  return (
    <header className={`scene ${styles.header}`} data-theme="paper">
      <a href={`#${contentId}`} className="skip-link">
        {T.allerAuContenu}
      </a>
      <div className={`container ${styles.headerBar}`}>
        <Link href="/lab/da-atelier" className={styles.logo}>
          <Logo className={styles.logoSvg} decorative />
          <span className="sr-only">{T.accueil}</span>
        </Link>
        <nav aria-label={T.navigation} className={styles.nav} data-open={menu}>
          <ul id="da-atelier-nav" className={styles.navList}>
            {T.rubriques.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link link--quiet">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.headerTools}>
          <button type="button" className={`link link--quiet ${styles.menuBtn}`} aria-expanded={menu} aria-controls="da-atelier-nav" onClick={() => setMenu((v) => !v)}>
            {menu ? T.fermer : T.menu}
          </button>
          <button type="button" className={`link link--quiet ${styles.cartBtn}`} onClick={open} aria-label={count ? T.panierPieces(count) : T.panierVide}>
            {T.panier}
            {count ? (
              <span className={styles.cartCount} aria-hidden="true">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      <div className={styles.ruler} aria-hidden="true" />
    </header>
  );
}
