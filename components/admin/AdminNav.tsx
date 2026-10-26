"use client";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

/**
 * Entrées de l'Atelier, au modèle de la Maison : chaque pièce est créée sur demande, sans stock.
 * Le Catalogue règle les prix, les délais de fabrication et les indicateurs « provisoire » ; les
 * Commandes avancent d'étape en étape de confection ; les Certificats portent les numéros de
 * création ; les Avant-premières annoncent la prochaine collection (adresse /drops conservée).
 * `compte` : ce que dit le nombre affiché à côté de l'entrée (lu par les lecteurs d'écran).
 */
const LINKS: { href: string; label: string; compte?: string }[] = [
  { href: "/", label: "Vue d’ensemble" },
  { href: "/validations", label: "Validations", compte: "à valider" },
  { href: "/messages", label: "Messages", compte: "à traiter" },
  { href: "/commandes", label: "Commandes" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/certificats", label: "Certificats" },
  { href: "/drops", label: "Avant-premières" },
  { href: "/rendez-vous", label: "Rendez-vous" },
  { href: "/retours", label: "Retours", compte: "à traiter" },
  { href: "/factures", label: "Factures" },
  { href: "/avis", label: "Avis" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pages", label: "Pages" },
  { href: "/pages/photos", label: "Photos" },
  { href: "/e-mails", label: "E-mails" },
  { href: "/contenus", label: "Contenus" },
  { href: "/seo", label: "SEO & IA" },
  { href: "/rapports", label: "Rapports" },
  { href: "/equipe", label: "Équipe" },
  { href: "/journal", label: "Journal des actions" },
  { href: "/reglages", label: "Réglages" },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  const router = useRouter();
  const atelier = useAtelier();
  return (
    <nav className="admin-nav" aria-label="Tableau de bord">
      <ul>
        {LINKS.map((l) => {
          const href = atelier.href(l.href);
          const on = l.href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const n = counts[l.href];
          return (
            <li key={l.href}>
              <Link href={href} className="admin-nav__link" aria-current={on ? "page" : undefined}>
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
        })}
      </ul>
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
    </nav>
  );
}
