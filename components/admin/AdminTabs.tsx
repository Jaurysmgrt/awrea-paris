"use client";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useAtelier } from "./AtelierContext";
import { AtelierIcone, type NomIcone } from "./AtelierIcone";

/**
 * Sur téléphone et tablette (application installée comprise), les cinq gestes les plus fréquents à
 * portée de pouce, en bas de l'écran. Le menu complet reste en haut, derrière « Menu ». Masqué sur
 * ordinateur, où la colonne de gauche montre tout. Chaque onglet a son icône au-dessus du mot, comme
 * dans les applications du téléphone (retour du 09/11 : « intuitif, aussi sur téléphone »).
 */
const ONGLETS: { href: string; label: string; icone: NomIcone; compte?: string }[] = [
  { href: "/", label: "Accueil", icone: "accueil" },
  { href: "/commandes", label: "Commandes", icone: "commandes" },
  { href: "/catalogue", label: "Produits", icone: "produits" },
  { href: "/clientes", label: "Clientes", icone: "clientes" },
  { href: "/validations", label: "À valider", icone: "valider", compte: "à valider" },
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
                <span className="admin-tabs__icone">
                  <AtelierIcone nom={o.icone} />
                  {n ? (
                    <span className="admin-tabs__compte">
                      {n}
                      {o.compte ? <span className="sr-only"> {o.compte}</span> : null}
                    </span>
                  ) : null}
                </span>
                <span className="admin-tabs__mot">{o.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
