import Link from "@/components/ui/Link";
import { getCollections } from "@/lib/commerce";
import { atelierHref } from "@/lib/admin/path";
import { CatalogueForm } from "@/components/admin/CatalogueForm";

/**
 * Nouvelle pièce : des photos, le nom, le prix, le délai et quelques notes ; l'agent Catalogue
 * rédige la fiche à partir de ce qui lui est donné, sans rien inventer (matière, composition, taille).
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
        <p className="t-lead">Quelques photos et vos notes suffisent : la fiche est rédigée à partir de ce que vous indiquez, rien de plus.</p>
      </header>
      <section className="panel" id="nouvelle-piece" aria-label="Nouvelle pièce">
        <CatalogueForm collections={collections.map((c) => ({ handle: c.handle, title: c.title }))} />
      </section>
    </div>
  );
}
