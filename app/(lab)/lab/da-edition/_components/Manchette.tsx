"use client";
/**
 * La manchette : le titre courant de la revue. Le monogramme (qui se dessine à la première visite),
 * le numéro en cours, cinq rubriques en toutes lettres, puis le courrier, la recherche, le compte
 * et le panier, en mots et jamais en pictogrammes. Elle tient sans image derrière elle, se retire
 * quand on lit vers le bas et revient dès qu'on remonte. Sur téléphone : Sommaire, monogramme,
 * Panier.
 */
import Link from "@/components/ui/Link";
import { useEffect, useRef, useState } from "react";
import { logoPaths } from "@/content/brand/logo-paths";
import { useCart } from "@/components/commerce/CartProvider";
import { roman } from "@/lib/format";
import { BoutonCourrier } from "./Courrier";
import { manchette, numero } from "./textes";
import s from "../da-edition.module.css";

export function Manchette({ accueil }: { accueil: string }) {
  const { cart, open: openCart } = useCart();
  const [menu, setMenu] = useState(false);
  const [cachee, setCachee] = useState(false);
  const last = useRef(0);
  const panneau = useRef<HTMLDivElement>(null);
  const count = cart?.totalQuantity ?? 0;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 240 && y > last.current + 4) setCachee(true);
      else if (y < last.current - 4 || y < 240) setCachee(false);
      last.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    panneau.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const panier = (
    <button type="button" className="link link--quiet" onClick={openCart} aria-haspopup="dialog">
      {manchette.panier}
      <span className={s.panierCompte} aria-hidden="true">
        {count}
      </span>
      <span className="sr-only">, {manchette.piecesAuPanier(count)}</span>
    </button>
  );

  return (
    <header className={s.manchette} data-theme="ivory" data-cachee={cachee && !menu}>
      <div className={s.manchetteLigne}>
        <button
          type="button"
          className={`link link--quiet ${s.manchetteMenu}`}
          aria-expanded={menu}
          aria-controls="sommaire-du-site"
          onClick={() => setMenu((v) => !v)}
        >
          {menu ? manchette.fermer : manchette.ouvrir}
        </button>

        <Link href={accueil} className={s.manchetteLogo} aria-label={manchette.accueil}>
          <svg viewBox={logoPaths.viewBox} className={s.logoTrace} aria-hidden="true" focusable="false">
            <path className={s.traceAw} d={logoPaths.aw} pathLength={1} />
            <path className={s.traceParis} d={logoPaths.paris} />
          </svg>
          <span className={`t-label ${s.manchetteMarque}`} aria-hidden="true">
            {numero.ligne}
          </span>
        </Link>

        <nav aria-label={manchette.navigation} className={s.manchetteNav}>
          <ul>
            {manchette.rubriques.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="link link--quiet">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.manchetteOutils}>
          <span className={s.manchetteOutilsLarges}>
            <BoutonCourrier label={manchette.courrier} className="link link--quiet" />
          </span>
          <span className={s.manchetteOutilsLarges}>
            <Link href={manchette.rechercher.href} className="link link--quiet">
              {manchette.rechercher.label}
            </Link>
          </span>
          <span className={s.seulementGrand}>
            <Link href={manchette.compte.href} className="link link--quiet">
              {manchette.compte.label}
            </Link>
          </span>
          {panier}
        </div>
      </div>

      <div id="sommaire-du-site" ref={panneau} className={s.panneau} data-ouvert={menu} inert={!menu} aria-label={manchette.panneau} role="region">
        <nav aria-label={manchette.navigation}>
          <ol className={s.panneauListe}>
            {manchette.rubriques.map((r, i) => (
              <li key={r.href}>
                <Link href={r.href} className={s.panneauLien} onClick={() => setMenu(false)}>
                  <span className={`t-label ${s.rubrique}`} aria-hidden="true">
                    {roman(i + 1)}
                  </span>
                  {r.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <div className={s.panneauOutils}>
          <BoutonCourrier label={manchette.courrier} className="link" />
          <Link href={manchette.rechercher.href} className="link">
            {manchette.rechercher.label}
          </Link>
          <Link href={manchette.compte.href} className="link">
            {manchette.compte.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
