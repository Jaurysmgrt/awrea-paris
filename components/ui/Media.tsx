import type { Image } from "@/lib/commerce/types";
import { imageAt, isSized } from "@/lib/media";

/**
 * Image responsive. Les visuels locaux existent en 480, 960 et pleine largeur (WebP) ;
 * les visuels Shopify utilisent les paramètres de largeur du CDN.
 */
export function srcSet(src: string): { src: string; srcSet: string } {
  if (src.startsWith("http")) return { src: imageAt(src, 1200), srcSet: ([480, 960, 1200] as const).map((w) => `${imageAt(src, w)} ${w}w`).join(", ") };
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
};

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function Media({ image, sizes = "(min-width: 64rem) 50vw, 100vw", priority, className, imgClassName, ratio = "portrait", alt, decorative, hoverOnly }: Props) {
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
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={imgClassName}
    />
  );
  return (
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
}
