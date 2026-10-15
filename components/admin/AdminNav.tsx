"use client";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";
import { useAtelier } from "./AtelierContext";

const LINKS = [
  { href: "/", label: "Vue d’ensemble" },
  { href: "/validations", label: "Validations" },
  { href: "/messages", label: "Messages" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/commandes", label: "Commandes" },
  { href: "/retours", label: "Retours" },
  { href: "/factures", label: "Factures" },
  { href: "/certificats", label: "Certificats" },
  { href: "/drops", label: "Drops" },
  { href: "/avis", label: "Avis" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pages", label: "Pages" },
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
          const on = l.href === "/" ? pathname === href : pathname.startsWith(href);
          const n = counts[l.href];
          return (
            <li key={l.href}>
              <Link href={href} className="admin-nav__link" aria-current={on ? "page" : undefined}>
                <span>{l.label}</span>
                {n ? <span className="admin-nav__count">{n}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="link link--quiet admin-nav__logout"
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
