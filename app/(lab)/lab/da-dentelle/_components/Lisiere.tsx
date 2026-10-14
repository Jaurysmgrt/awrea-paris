"use client";
/**
 * La lisière : l'en-tête comme le bord droit d'une pièce de dentelle.
 * Le monogramme-médaillon à gauche (jamais centré), cinq entrées au plus, alignées sur les
 * colonnes 4, 6, 8, 10 et 12 de la grille ; dessous, le réseau rendu visible par douze picots.
 * Sur téléphone : le médaillon, « Menu » et « Panier ».
 */
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/commerce/CartProvider";
import { Medaillon } from "./Medaillon";
import { Reseau } from "./Reseau";
import s from "../da-dentelle.module.css";

const ENTREES = [
  { href: "/boutique", label: "Les pièces" },
  { href: "/atelier", label: "L’atelier" },
  { href: "/la-maison", label: "La Maison" },
  { href: "/recherche", label: "Rechercher" },
];

export function Lisiere() {
  const pathname = usePathname();
  const { cart, open } = useCart();
  const [menu, setMenu] = useState(false);
  const count = cart?.totalQuantity ?? 0;

  // Échap referme le menu du téléphone
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <header className={s.lisiere} data-theme="ivory">
      <div className={`container ${s.grille} ${s.lisiereGrille}`}>
        <Link href="/lab/da-dentelle" className={s.lisiereMarque} aria-current={pathname === "/lab/da-dentelle" ? "page" : undefined}>
          <Medaillon />
          <span className="sr-only">Awrea Paris — accueil</span>
        </Link>
        <nav id="lisiere-nav" aria-label="Navigation principale" className={s.lisiereNav} data-ouvert={menu}>
          <ul>
            {ENTREES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="link link--quiet" onClick={() => setMenu(false)}>
                  {e.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={s.lisiereActions}>
          <button type="button" className={`link link--quiet ${s.lisiereMenu}`} aria-expanded={menu} aria-controls="lisiere-nav" onClick={() => setMenu((v) => !v)}>
            {menu ? "Fermer" : "Menu"}
          </button>
          <button type="button" className="link link--quiet" onClick={open} aria-haspopup="dialog">
            Panier<span className={s.lisiereCompte} aria-hidden="true">{count}</span>
            <span className="sr-only">
              {" "}
              : {count} pièce{count > 1 ? "s" : ""}
            </span>
          </button>
        </div>
      </div>
      <div className="container">
        <Reseau />
      </div>
    </header>
  );
}
