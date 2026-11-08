"use client";
import { useState } from "react";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

/**
 * Menu de l'Atelier, simple et clair (brief de la créatrice du 03/11 et du 07/11) :
 * Accueil, Ma boutique, Mon site, Mon activité, Intelligence artificielle, Paramètres. Chaque entrée
 * porte le titre de sa page. Les sous-entrées (Retours sous Commandes, Avis sous Clientes…)
 * n'apparaissent que dans leur rubrique ; ce qui attend d'être traité remonte alors sur la rubrique.
 * Aucune entrée sans page : Promotions, Statistiques et l'assistant arrivent avec leurs pages.
 * Chaque pièce est créée sur demande, sans stock : rien ici ne parle de stock.
 * `compte` : ce que dit le nombre affiché à côté de l'entrée (lu par les lecteurs d'écran).
 * Sur téléphone, le menu se replie derrière un bouton.
 */
type Entree = { href: string; label: string; compte?: string; sous?: Entree[] };
const GROUPES: { titre?: string; liens: Entree[] }[] = [
  { liens: [{ href: "/", label: "Vue d’ensemble" }] },
  {
    titre: "Ma boutique",
    liens: [
      {
        href: "/catalogue",
        label: "Produits",
        sous: [
          { href: "/drops", label: "Avant-premières" },
          { href: "/certificats", label: "Certificats" },
        ],
      },
      {
        href: "/commandes",
        label: "Commandes",
        sous: [
          { href: "/retours", label: "Retours", compte: "à traiter" },
          { href: "/factures", label: "Factures" },
        ],
      },
      { href: "/clientes", label: "Clientes", sous: [{ href: "/avis", label: "Avis", compte: "à relire" }] },
    ],
  },
  {
    titre: "Mon site",
    liens: [
      { href: "/pages", label: "Pages", sous: [{ href: "/seo", label: "Référencement" }] },
      { href: "/pages/photos", label: "Photos" },
      { href: "/e-mails", label: "E-mails" },
      { href: "/contenus", label: "Instagram" },
    ],
  },
  {
    titre: "Mon activité",
    liens: [
      { href: "/rendez-vous", label: "Rendez-vous" },
      { href: "/messages", label: "Messages", compte: "à traiter" },
      { href: "/rapports", label: "Rapports" },
    ],
  },
  {
    titre: "Intelligence artificielle",
    liens: [
      { href: "/validations", label: "À valider", compte: "à valider" },
      { href: "/equipe", label: "Agents", sous: [{ href: "/journal", label: "Journal des actions" }] },
    ],
  },
  { titre: "Paramètres", liens: [{ href: "/reglages", label: "Réglages" }] },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  const router = useRouter();
  const atelier = useAtelier();
  const [ouvert, setOuvert] = useState(false);
  const actif = (href: string) => {
    const full = atelier.href(href);
    if (href === "/") return pathname === full;
    // « Pages » ne s'allume pas sur « Photos », qui a sa propre entrée
    if (href === "/pages") return pathname === full || (pathname.startsWith(`${full}/`) && !pathname.startsWith(atelier.href("/pages/photos")));
    return pathname === full || pathname.startsWith(`${full}/`);
  };
  /** la rubrique est ouverte quand on est sur sa page ou sur l'une de ses sous-pages */
  const ouverte = (l: Entree) => actif(l.href) || Boolean(l.sous?.some((s) => actif(s.href)));

  const lien = (l: Entree, sous = false) => {
    const deplie = ouverte(l);
    // rubrique repliée : ce qui attend dans ses sous-pages s'affiche sur elle
    const n = (counts[l.href] ?? 0) + (deplie ? 0 : (l.sous ?? []).reduce((t, s) => t + (counts[s.href] ?? 0), 0));
    const quoi = l.compte ?? l.sous?.find((s) => counts[s.href])?.compte;
    return (
      <li key={l.href}>
        <Link href={atelier.href(l.href)} className={sous ? "admin-nav__link admin-nav__link--sous" : "admin-nav__link"} aria-current={actif(l.href) ? "page" : undefined} onClick={() => setOuvert(false)}>
          <span>{l.label}</span>
          {n ? (
            <span className="admin-nav__count">
              {n}
              {quoi ? <span className="sr-only"> {quoi}</span> : null}
            </span>
          ) : null}
        </Link>
        {l.sous && deplie ? <ul className="admin-nav__sous">{l.sous.map((s) => lien(s, true))}</ul> : null}
      </li>
    );
  };

  return (
    <nav className="admin-nav" aria-label="Menu de l’Atelier" data-open={ouvert}>
      <button type="button" className="admin-nav__toggle" aria-expanded={ouvert} aria-controls="admin-nav-groupes" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? "Fermer le menu" : "Menu"}
      </button>
      <div id="admin-nav-groupes" className="admin-nav__groupes">
        {GROUPES.map((g) => (
          <div key={g.titre ?? "accueil"} className="admin-nav__groupe">
            {g.titre ? <p className="admin-nav__titre">{g.titre}</p> : null}
            <ul>{g.liens.map((l) => lien(l))}</ul>
          </div>
        ))}
        <button
          type="button"
          className="btn btn--link admin-nav__logout"
          onClick={async () => {
            await fetch(atelier.api("/logout"), { method: "POST" });
            router.push(atelier.href("/connexion"));
          }}
        >
          Se déconnecter
        </button>
        {/* sur téléphone, le bas de la colonne est masqué : le site reste à portée depuis le menu */}
        <Link href="/" className="btn btn--link admin-nav__site">
          Voir le site
        </Link>
      </div>
    </nav>
  );
}
