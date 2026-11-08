"use client";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useAtelier } from "./AtelierContext";

/**
 * Sur téléphone et tablette (application installée comprise), les cinq gestes les plus fréquents à
 * portée de pouce, en bas de l'écran. Le menu complet reste en haut, derrière « Menu ». Masqué sur
 * ordinateur, où la colonne de gauche montre tout.
 */
const ONGLETS: { href: string; label: string; compte?: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/commandes", label: "Commandes" },
  { href: "/catalogue", label: "Produits" },
  { href: "/clientes", label: "Clientes" },
  { href: "/validations", label: "À valider", compte: "à valider" },
];

export function AdminTabs({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  const atelier = useAtelier();
  const actif = (href: string) => {
    const full = atelier.href(href);
    return href === "/" ? pathname === full : pathname === full || pathname.startsWith(`${full}/`);
  };
  return (
    <nav className="admin-tabs no-print" aria-label="Raccourcis de l’Atelier">
      <ul>
        {ONGLETS.map((o) => {
          const n = counts[o.href] ?? 0;
          return (
            <li key={o.href}>
              <Link href={atelier.href(o.href)} className="admin-tabs__lien" aria-current={actif(o.href) ? "page" : undefined}>
                <span>{o.label}</span>
                {n ? (
                  <span className="admin-tabs__compte">
                    {n}
                    {o.compte ? <span className="sr-only"> {o.compte}</span> : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
