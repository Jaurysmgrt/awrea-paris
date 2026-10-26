import Link from "@/components/ui/Link";
import type { Product } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { Price } from "@/components/ui/Price";
import { getDoc } from "@/lib/edition/read";
import { delaiText, fill, type CatalogueTexts } from "@/lib/commerce/texts";
import { WishlistButton } from "./WishlistButton";
import { CardVideo } from "./CardVideo";
import { ProvisionalNote } from "./ProvisionalNote";

/**
 * Carte d'une pièce (maquette PAGE PRODUIT) : photo aux angles arrondis, seconde image puis vidéo
 * au survol ; sous la photo, au fer à gauche, la pastille noire « Nouveau », le nom en Cormorant
 * (« Le body Aura ») et le prix à la ligne (« 70,00 € »), puis le délai de fabrication de la pièce
 * créée sur demande. Une photo provisoire porte la mention « visuel provisoire ».
 */
export async function ProductCard({ product, sizes, priority, headingLevel = 3 }: { product: Product; sizes?: string; priority?: boolean; headingLevel?: 2 | 3 }) {
  const t = await getDoc<CatalogueTexts>("catalogue");
  const H = `h${headingLevel}` as "h2" | "h3";
  const [first, second] = product.images;
  return (
    <article className="product-card">
      <Link href={`/boutique/${product.handle}`} className="product-card__link">
        <div className="product-card__media reveal-img">
          <Media image={first} sizes={sizes} priority={priority} className="product-card__img" />
          {second ? <Media image={second} sizes={sizes} className="product-card__img product-card__img--alt" decorative hoverOnly /> : null}
          {product.video ? <CardVideo src={product.video.src} /> : null}
        </div>
        <div className="product-card__body">
          {product.isNew ? <span className="badge product-card__badge">{t.nouveau}</span> : null}
          <H className="t-body product-card__title">{product.title}</H>
          <Price amount={product.price} />
        </div>
        <p className="t-note t-left product-card__lead">{fill(t.surDemande.carte, { delai: delaiText(t, product.leadTime) })}</p>
        <ProvisionalNote image={first} />
      </Link>
      <div className="product-card__wish">
        <WishlistButton handle={product.handle} title={product.title} variant="icon" />
      </div>
    </article>
  );
}
