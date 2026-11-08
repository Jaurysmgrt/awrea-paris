import Link from "@/components/ui/Link";
import { getCollections } from "@/lib/commerce";
import { atelierHref } from "@/lib/admin/path";
import { NouvellePiece } from "@/components/admin/NouvellePiece";

/**
 * Nouvelle pièce, en quatre étapes courtes : des photos, le nom et les tailles, le prix et le délai,
 * quelques notes. L'agent Catalogue rédige la fiche à partir de ce qui lui est donné, sans rien
 * inventer (matière, composition, taille) ; la pièce naît en brouillon et sa fiche s'ouvre.
 */
export default async function NouvellePiecePage() {
  const collections = await getCollections().catch(() => []);
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <p className="t-note">
          <Link href={atelierHref("/catalogue")} className="text-link">
            Produits
          </Link>
        </p>
        <h1 className="t-h1">Nouvelle pièce</h1>
        <p className="t-lead">Quelques photos et vos notes suffisent : la fiche est rédigée à partir de ce que vous indiquez, rien de plus. La pièce reste en brouillon tant que vous ne l’avez pas mise en ligne.</p>
      </header>
      <section className="panel" id="nouvelle-piece" aria-label="Nouvelle pièce">
        <NouvellePiece collections={collections.map((c) => ({ handle: c.handle, title: c.title }))} />
      </section>
    </div>
  );
}
