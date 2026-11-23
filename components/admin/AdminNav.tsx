"use client";
import { useState } from "react";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";
import { AtelierIcone, type NomIcone } from "./AtelierIcone";

/**
 * Menu de l'Atelier, simple et clair (brief de la créatrice du 03/11 et du 07/11) :
 * Accueil, Ma boutique, Mon site, Mon activité, Intelligence artificielle, Paramètres. Chaque entrée
 * porte le titre de sa page. Les sous-entrées (Retours, Paiements et Factures sous Commandes, Avis
 * sous Clientes…) restent toujours visibles, en petit sous leur rubrique : « Où sont mes factures ? »
 * a sa réponse depuis l'accueil (parcours UX du 23/11). « Se déconnecter » reste au bas de la colonne,
 * toujours à portée, même quand le menu défile.
 * Aucune entrée sans page : Promotions, Statistiques et l'assistant arrivent avec leurs pages.
 * Chaque pièce est créée sur demande, sans stock : rien ici ne parle de stock.
 * `compte` : ce que dit le nombre affiché à côté de l'entrée (lu par les lecteurs d'écran).
 * Sur téléphone, le menu se replie derrière un bouton.
 * Retour du 09/11 (« inverser la graisse, que ce soit intuitif ») : intitulés de groupe discrets, entrées
 * en medium avec leur icône, la page en cours en noir plein.
 */
type Entree = { href: string; label: string; icone?: NomIcone; compte?: string; sous?: Entree[] };
const GROUPES: { titre?: string; liens: Entree[] }[] = [
  { liens: [{ href: "/", label: "Vue d’ensemble", icone: "accueil" }] },
  {
    titre: "Ma boutique",
    liens: [
      {
        href: "/catalogue",
        label: "Produits",
        icone: "produits",
        sous: [
          { href: "/drops", label: "Avant-premières" },
          { href: "/certificats", label: "Certificats" },
        ],
      },
      {
        href: "/commandes",
        label: "Commandes",
        icone: "commandes",
        sous: [
          { href: "/retours", label: "Retours", compte: "à traiter" },
          { href: "/paiements", label: "Paiements" },
          { href: "/factures", label: "Factures" },
        ],
      },
      { href: "/clientes", label: "Clientes", icone: "clientes", sous: [{ href: "/avis", label: "Avis", compte: "à relire" }] },
    ],
  },
  {
    titre: "Mon site",
    liens: [
      { href: "/pages", label: "Pages", icone: "pages", sous: [{ href: "/seo", label: "Référencement" }] },
      { href: "/pages/photos", label: "Photos", icone: "photos" },
      { href: "/e-mails", label: "E-mails", icone: "emails" },
      { href: "/contenus", label: "Instagram", icone: "instagram" },
    ],
  },
  {
    titre: "Mon activité",
    liens: [
      { href: "/rendez-vous", label: "Rendez-vous", icone: "rendezvous" },
      { href: "/messages", label: "Messages", icone: "messages", compte: "à traiter" },
      { href: "/rapports", label: "Rapports", icone: "rapports" },
    ],
  },
  {
    titre: "Intelligence artificielle",
    liens: [
      { href: "/validations", label: "À valider", icone: "valider", compte: "à valider" },
      { href: "/equipe", label: "Agents", icone: "agents", sous: [{ href: "/journal", label: "Journal des actions" }] },
    ],
  },
  { titre: "Paramètres", liens: [{ href: "/reglages", label: "Réglages", icone: "reglages", sous: [{ href: "/application", label: "Application" }] }] },
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
  const lien = (l: Entree, sous = false) => {
    // chaque sous-entrée porte son propre nombre de choses à traiter
    const n = counts[l.href] ?? 0;
    const quoi = l.compte;
    return (
      <li key={l.href}>
        <Link href={atelier.href(l.href)} className={sous ? "admin-nav__link admin-nav__link--sous" : "admin-nav__link"} aria-current={actif(l.href) ? "page" : undefined} onClick={() => setOuvert(false)}>
          <span className="admin-nav__libelle">
            {l.icone ? <AtelierIcone nom={l.icone} /> : null}
            <span>{l.label}</span>
          </span>
          {n ? (
            <span className="admin-nav__count">
              {n}
              {quoi ? <span className="sr-only"> {quoi}</span> : null}
            </span>
          ) : null}
        </Link>
        {l.sous ? <ul className="admin-nav__sous">{l.sous.map((s) => lien(s, true))}</ul> : null}
      </li>
    );
  };

  return (
    <nav className="admin-nav" aria-label="Menu de l’Atelier" data-open={ouvert}>
      <button type="button" className="admin-nav__toggle" aria-expanded={ouvert} aria-controls="admin-nav-groupes" aria-label={ouvert ? "Fermer le menu" : undefined} onClick={() => setOuvert((o) => !o)}>
        <AtelierIcone nom={ouvert ? "fermer" : "menu"} />
        <span>{ouvert ? "Fermer" : "Menu"}</span>
      </button>
      <div id="admin-nav-groupes" className="admin-nav__groupes">
        {GROUPES.map((g) => (
          <div key={g.titre ?? "accueil"} className="admin-nav__groupe">
            {g.titre ? <p className="admin-nav__titre">{g.titre}</p> : null}
            <ul>{g.liens.map((l) => lien(l))}</ul>
          </div>
        ))}
      </div>
      <div className="admin-nav__compte">
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
