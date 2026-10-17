"use client";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { VideoLazy } from "@/components/ui/VideoLazy";
import { LaceLoupe } from "@/components/signature/LaceLoupe";

/** Galerie : empilée sur grand écran, carrousel à défilement magnétique sur mobile. */
export function ProductGallery({ product }: { product: Product }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const slides = [
    ...product.images.map((img, i) => ({ kind: "image" as const, key: img.src + i, img })),
    ...(product.video ? [{ kind: "video" as const, key: "video" }] : []),
    { kind: "loupe" as const, key: "loupe" },
  ];

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("li").forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);

  return (
    <div className="gallery">
      <ul ref={track} className="gallery__track" aria-label={`Photographies de ${product.title}`}>
        {slides.map((s, i) => (
          <li key={s.key} data-index={i} className={`gallery__slide gallery__slide--${s.kind}`}>
            {s.kind === "image" ? (
              <Media image={s.img} priority={i === 0} sizes="(min-width: 64rem) 35vw, 88vw" />
            ) : s.kind === "video" && product.video ? (
              <VideoLazy src={product.video.src} poster={product.video.poster} label={product.video.alt} className="media media--portrait" />
            ) : (
              <LaceLoupe image={product.detailImage} />
            )}
          </li>
        ))}
      </ul>
      <p className="gallery__count t-label" aria-hidden="true">
        {index + 1} / {slides.length}
      </p>
    </div>
  );
}
