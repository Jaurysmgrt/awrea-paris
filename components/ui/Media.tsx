import type { Image } from "@/lib/commerce/types";
import { imageAt, isSized, isStoredEdition } from "@/lib/media";
import { ProvisionalNote } from "@/components/commerce/ProvisionalNote";

/**
 * Image responsive. Les visuels locaux existent en 480, 960 et pleine largeur (WebP) ;
 * les visuels Shopify utilisent les paramètres de largeur du CDN.
 *
 * `provisoire` (facultatif) : pour une photo provisoire (image générée en attendant les prises de
 * vue, `image.provisoire`), la mention discrète « visuel provisoire » suit la photo, juste dessous,
 * jamais en surimpression : la même mention sur toutes les pages (texte du document « catalogue »).
 * Passer `provisoire={image.provisoire}` là où la page ne l'affiche pas déjà elle-même.
 */
export function srcSet(src: string): { src: string; srcSet: string } {
  if (src.startsWith("http") && !isStoredEdition(src)) return { src: imageAt(src, 1200), srcSet: ([480, 960, 1200] as const).map((w) => `${imageAt(src, w)} ${w}w`).join(", ") };
  if (!isSized(src)) return { src, srcSet: "" };
  return { src: imageAt(src, 1200), srcSet: `${imageAt(src, 480)} 480w, ${imageAt(src, 960)} 960w, ${imageAt(src, 1200)} 1200w` };
}

type Props = {
  image: Image;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  ratio?: "portrait" | "tall" | "look" | "landscape" | "wide" | "auto";
  alt?: string;
  decorative?: boolean;
  /** image réservée au survol (seconde vue d'une carte) : jamais téléchargée sur écran tactile */
  hoverOnly?: boolean;
  /** affiche la mention « visuel provisoire » sous la photo (photo provisoire) */
  provisoire?: boolean;
  /**
   * chargement immédiat sans priorité haute : pour les photos d'un carrousel (galerie d'une pièce),
   * qu'un chargement différé laisserait en case grise tant qu'on ne les a pas fait défiler
   */
  eager?: boolean;
};

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// ecriture-ok : requête média, sans espace avant les deux-points (une espace insécable la rendrait invalide)
export function Media({ image, sizes = "(min-width: 64rem) 50vw, 100vw", priority, className, imgClassName, ratio = "portrait", alt, decorative, hoverOnly, provisoire, eager }: Props) {
  const { src, srcSet: set } = srcSet(image.src);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={set || undefined}
      sizes={set ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={decorative ? "" : (alt ?? image.alt)}
      loading={priority || eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={imgClassName}
      style={image.focal ? { objectPosition: `${image.focal.x}% ${image.focal.y}%` } : undefined}
    />
  );
  const media = (
    <div className={`media ${ratio !== "auto" ? `media--${ratio}` : ""} ${className ?? ""}`}>
      {hoverOnly ? (
        <picture>
          <source media="(hover: none)" srcSet={BLANK} />
          {img}
        </picture>
      ) : (
        img
      )}
    </div>
  );
  if (!provisoire) return media;
  return (
    <>
      {media}
      <div className="media__caption">
        <ProvisionalNote image={{ provisoire: true }} />
      </div>
    </>
  );
}
