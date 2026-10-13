"use client";
import Link from "@/components/ui/Link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/gestion", label: "Vue d’ensemble" },
  { href: "/gestion/validations", label: "Validations" },
  { href: "/gestion/messages", label: "Messages" },
  { href: "/gestion/catalogue", label: "Catalogue" },
  { href: "/gestion/commandes", label: "Commandes" },
  { href: "/gestion/contenus", label: "Contenus" },
  { href: "/gestion/seo", label: "SEO & IA" },
  { href: "/gestion/rapports", label: "Rapports" },
  { href: "/gestion/journal", label: "Journal des actions" },
  { href: "/gestion/reglages", label: "Réglages" },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="admin-nav" aria-label="Tableau de bord">
      <ul>
        {LINKS.map((l) => {
          const on = l.href === "/gestion" ? pathname === l.href : pathname.startsWith(l.href);
          const n = counts[l.href];
          return (
            <li key={l.href}>
              <Link href={l.href} className="admin-nav__link" aria-current={on ? "page" : undefined}>
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
          await fetch("/api/gestion/logout", { method: "POST" });
          router.push("/gestion/connexion");
        }}
      >
        Se déconnecter
      </button>
    </nav>
  );
}
