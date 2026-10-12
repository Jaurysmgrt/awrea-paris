import type { Image } from "@/lib/commerce/types";

/**
 * Image responsive. Les visuels locaux existent en 480, 960 et pleine largeur (WebP) ;
 * les visuels Shopify utilisent les paramètres de largeur du CDN.
 */
export function srcSet(src: string): { src: string; srcSet: string } {
  if (src.startsWith("http")) {
    const u = (w: number) => `${src}${src.includes("?") ? "&" : "?"}width=${w}`;
    return { src: u(1200), srcSet: [480, 960, 1600].map((w) => `${u(w)} ${w}w`).join(", ") };
  }
  if (/\.(webp|jpg|png|svg)$/.test(src)) return { src, srcSet: "" };
  return { src: `${src}.webp`, srcSet: `${src}-480.webp 480w, ${src}-960.webp 960w, ${src}.webp 1200w` };
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
};

export function Media({ image, sizes = "(min-width: 64rem) 50vw, 100vw", priority, className, imgClassName, ratio = "portrait", alt, decorative }: Props) {
  const { src, srcSet: set } = srcSet(image.src);
  return (
    <div className={`media ${ratio !== "auto" ? `media--${ratio}` : ""} ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
    </div>
  );
}
