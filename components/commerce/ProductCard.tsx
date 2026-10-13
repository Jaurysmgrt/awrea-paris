import Link from "@/components/ui/Link";
import type { Product } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { Price } from "@/components/ui/Price";
import { EditionNumber } from "@/components/signature/EditionNumber";
import { WishlistButton } from "./WishlistButton";
import { availabilityLabel, productAvailability } from "@/lib/commerce/availability";

/** Carte produit : image, seconde image au survol, numéro d'édition, prix, disponibilité. */
export function ProductCard({ product, sizes, priority, headingLevel = 3 }: { product: Product; sizes?: string; priority?: boolean; headingLevel?: 2 | 3 }) {
  const a = productAvailability(product);
  const H = `h${headingLevel}` as "h2" | "h3";
  const second = product.images[1];
  return (
    <article className="product-card" data-availability={a}>
      <Link href={`/boutique/${product.handle}`} className="product-card__link">
        <div className="product-card__media reveal-img">
          <Media image={product.images[0]} sizes={sizes} priority={priority} className="product-card__img" />
          {second ? <Media image={second} sizes={sizes} className="product-card__img product-card__img--alt" decorative hoverOnly /> : null}
          {a !== "available" ? <span className="badge product-card__badge">{availabilityLabel(a, product.leadTimeWeeks)}</span> : null}
        </div>
        <div className="product-card__body">
          <H className="t-h4 product-card__title">{product.title}</H>
          <Price amount={product.price} compareAt={product.compareAtPrice} />
        </div>
        <EditionNumber product={product} variant="inline" />
      </Link>
      <div className="product-card__wish">
        <WishlistButton handle={product.handle} title={product.title} variant="icon" />
      </div>
    </article>
  );
}
