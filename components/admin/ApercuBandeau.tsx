/**
 * Bandeau de l'aperçu d'une pièce en brouillon ou archivée, au-dessus de son nom sur le site. Il ne
 * s'affiche que pour la créatrice connectée en mode Édition (lib/commerce/apercu.ts) : il rappelle
 * que ses clientes ne voient pas cette page, et ramène à la fiche de la pièce dans l'Atelier.
 */
import Link from "@/components/ui/Link";
import { atelierHref } from "@/lib/admin/path";
import type { StatutPiece } from "@/lib/commerce/statut-pieces";

const ETAT = { brouillon: "en brouillon", archivee: "archivée" } as const;

export function ApercuBandeau({ handle, statut }: { handle: string; statut: Exclude<StatutPiece, "en-ligne"> }) {
  return (
    <div className="apercu-bandeau" data-theme="pearl">
      <p className="t-note">
        <strong>Aperçu.</strong> Cette pièce est {ETAT[statut]} : vos clientes ne voient pas cette page. Elle se met en ligne depuis sa fiche, dans l’Atelier.{" "}
        <Link href={atelierHref(`/catalogue/${handle}`)} className="text-link">
          Revenir à sa fiche
        </Link>
      </p>
    </div>
  );
}
