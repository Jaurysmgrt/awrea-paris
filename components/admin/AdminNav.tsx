"use client";
import { useState } from "react";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

/**
 * Menu de l'Atelier, rangé comme une journée de la Maison (retour de la créatrice du 01/11 : « on
 * s'y perd ») : Aujourd'hui, puis les clientes, les pièces, le site et la gestion ; les rubriques
 * techniques (agents, journal, rapports, référencement) dorment dans « Coulisses », replié.
 * Chaque pièce est créée sur demande, sans stock : le Catalogue règle prix, délais et indicateurs
 * « provisoire », les Commandes avancent d'étape en étape de confection, les Certificats portent les
 * numéros de création, les Avant-premières annoncent la prochaine collection (adresse /drops).
 * `compte` : ce que dit le nombre affiché à côté de l'entrée (lu par les lecteurs d'écran).
 * Sur téléphone, le menu se replie derrière un bouton.
 */
type Entree = { href: string; label: string; compte?: string };
const GROUPES: { titre?: string; coulisses?: boolean; liens: Entree[] }[] = [
  { liens: [{ href: "/", label: "Aujourd’hui" }] },
  {
    titre: "Clientes",
    liens: [
      { href: "/commandes", label: "Commandes" },
      { href: "/rendez-vous", label: "Rendez-vous" },
      { href: "/messages", label: "Messages", compte: "à traiter" },
      { href: "/clientes", label: "Fichier clientes" },
      { href: "/retours", label: "Retours", compte: "à traiter" },
      { href: "/avis", label: "Avis" },
    ],
  },
  {
    titre: "Pièces",
    liens: [
      { href: "/catalogue", label: "Catalogue" },
      { href: "/drops", label: "Avant-premières" },
      { href: "/certificats", label: "Certificats" },
    ],
  },
  {
    titre: "Le site",
    liens: [
      { href: "/pages", label: "Pages" },
      { href: "/pages/photos", label: "Photos" },
      { href: "/e-mails", label: "E-mails" },
    ],
  },
  {
    titre: "Gestion",
    liens: [
      { href: "/validations", label: "À valider", compte: "à valider" },
      { href: "/factures", label: "Factures" },
      { href: "/reglages", label: "Réglages" },
    ],
  },
  {
    titre: "Coulisses",
    coulisses: true,
    liens: [
      { href: "/equipe", label: "Les agents" },
      { href: "/journal", label: "Journal des actions" },
      { href: "/rapports", label: "Rapports" },
      { href: "/seo", label: "Référencement" },
      { href: "/contenus", label: "Contenus" },
    ],
  },
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

  const lien = (l: Entree) => {
    const n = counts[l.href];
    return (
      <li key={l.href}>
        <Link href={atelier.href(l.href)} className="admin-nav__link" aria-current={actif(l.href) ? "page" : undefined} onClick={() => setOuvert(false)}>
          <span>{l.label}</span>
          {n ? (
            <span className="admin-nav__count">
              {n}
              {l.compte ? <span className="sr-only"> {l.compte}</span> : null}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav className="admin-nav" aria-label="Menu de l’Atelier" data-open={ouvert}>
      <button type="button" className="admin-nav__toggle" aria-expanded={ouvert} aria-controls="admin-nav-groupes" onClick={() => setOuvert((o) => !o)}>
        {ouvert ? "Fermer le menu" : "Menu"}
      </button>
      <div id="admin-nav-groupes" className="admin-nav__groupes">
        {GROUPES.map((g) =>
          g.coulisses ? (
            <details key={g.titre} className="admin-nav__groupe admin-nav__coulisses" open={g.liens.some((l) => actif(l.href)) || undefined}>
              <summary className="admin-nav__titre">{g.titre}</summary>
              <ul>{g.liens.map(lien)}</ul>
            </details>
          ) : (
            <div key={g.titre ?? "accueil"} className="admin-nav__groupe">
              {g.titre ? <p className="admin-nav__titre">{g.titre}</p> : null}
              <ul>{g.liens.map(lien)}</ul>
            </div>
          ),
        )}
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
      </div>
    </nav>
  );
}
