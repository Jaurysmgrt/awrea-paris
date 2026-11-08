import Link from "@/components/ui/Link";
import { getCollections } from "@/lib/commerce";
import { listerPieces, MESSAGE_LECTURE_SEULE } from "@/lib/commerce/atelier-catalogue";
import { formatPrice } from "@/lib/format";
import { imageAt } from "@/lib/media";
import { atelierHref } from "@/lib/admin/path";
import { ListeProduits, type LigneProduit } from "@/components/admin/ListeProduits";

/**
 * Produits (refonte du 07/11, « Shopify simplifié ») : toutes les pièces, en ligne, en brouillon ou
 * archivées, avec une recherche et des filtres ; chaque ligne ouvre la fiche de la pièce, où se
 * règlent ses textes, son prix, son délai et son statut. Chaque pièce est créée sur demande, sans
 * stock. L'ajout d'une pièce a sa propre page (Nouvelle pièce).
 */
export default async function CataloguePage() {
  const [{ pieces, complet, modifiable }, collections] = await Promise.all([listerPieces(), getCollections().catch(() => [])]);
  const nomCollection = new Map(collections.map((c) => [c.handle, c.title]));
  const lignes: LigneProduit[] = pieces.map((p) => ({
    handle: p.handle,
    title: p.title,
    image: p.image ? imageAt(p.image.src, 480) : null,
    prix: p.priceVaries ? `À partir de ${formatPrice(p.price)}` : formatPrice(p.price),
    statut: p.statut,
    collection: nomCollection.get(p.collection) ?? "",
    notes: [!p.nombreTailles ? "aucune taille" : "", p.priceProvisional ? "prix à confirmer" : "", p.leadTimeProvisional ? "délai à confirmer" : ""].filter(Boolean),
  }));
  return (
    <div className="admin-page stack-l">
      <header className="admin-page__head">
        <h1 className="t-h1">Produits</h1>
        <p className="t-lead">Toutes vos pièces, en ligne ou en préparation. Touchez une pièce pour la modifier.</p>
        {modifiable ? (
          <Link href={atelierHref("/catalogue/nouveau")} className="btn">
            Ajouter un produit
          </Link>
        ) : (
          <p className="t-note">{MESSAGE_LECTURE_SEULE}</p>
        )}
      </header>
      {complet ? null : <p className="t-note">La boutique compte plus de 1 000 pièces : seules les 1 000 premières, par ordre alphabétique, sont listées ici.</p>}
      <ListeProduits pieces={lignes} />
    </div>
  );
}
