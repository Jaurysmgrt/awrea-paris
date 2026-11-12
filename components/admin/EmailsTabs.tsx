import Link from "@/components/ui/Link";
import { atelierHref } from "@/lib/admin/path";

/**
 * Onglets de la rubrique E-mails (demande de la créatrice du 02/11) : la lettre qu'elle écrit et
 * envoie, les inscrites, les e-mails partis, les e-mails automatiques qu'elle modifie, et les
 * parcours de vente (cahier de l'Atelier du 10/11).
 */
const ONGLETS = [
  { href: "/e-mails", label: "La lettre" },
  { href: "/e-mails/inscrites", label: "Inscrites" },
  { href: "/e-mails/envoyes", label: "Envoyés" },
  { href: "/e-mails/automatiques", label: "Automatiques" },
  { href: "/e-mails/parcours", label: "Parcours" },
] as const;

export function EmailsTabs({ actif }: { actif: (typeof ONGLETS)[number]["href"] }) {
  return (
    <nav aria-label="Rubriques des e-mails" className="segmented onglets">
      {ONGLETS.map((o) => (
        <Link key={o.href} href={atelierHref(o.href)} className="segmented__item" aria-current={o.href === actif ? "page" : undefined}>
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
