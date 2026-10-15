"use client";
/**
 * SIGNATURE 7 — Shop the look.
 * Des points lumineux posés sur la photographie : chacun ouvre la pièce correspondante,
 * que l'on peut ajouter au panier sans quitter l'image. Accessible au clavier ;
 * sur mobile, la pièce s'ouvre sous l'image.
 */
import { useEffect, useRef, useState } from "react";
import type { Look, Product } from "@/lib/commerce/types";
import { Media } from "@/components/ui/Media";
import { QuickAdd } from "@/components/commerce/QuickAdd";
import { Icon } from "@/components/ui/Icon";

export function ShopTheLook({ look, products, priority }: { look: Look; products: Product[]; priority?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const items = look.hotspots
    .map((h) => ({ h, p: products.find((p) => p.handle === h.product) }))
    .filter((x): x is { h: Look["hotspots"][number]; p: Product } => Boolean(x.p));

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const current = active !== null ? items[active] : null;

  return (
    <figure className="look">
      <div className="look__stage">
        <Media image={look.image} ratio="look" priority={priority} sizes="(min-width: 64rem) 55vw, 100vw" />
        {items.map(({ h, p }, i) => (
          <button
            key={p.handle}
            type="button"
            className="look__dot"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            aria-expanded={active === i}
            aria-controls={`look-${look.handle}-panel`}
            onClick={() => setActive(active === i ? null : i)}
          >
            <span className="sr-only">Voir {p.title}</span>
          </button>
        ))}
        {current ? (
          <div
            id={`look-${look.handle}-panel`}
            ref={panelRef}
            className="look__panel scene"
            data-theme="ivory"
            data-side={current.h.x > 50 ? "left" : "right"}
            style={{ "--y": `${Math.min(Math.max(current.h.y, 18), 70)}%` } as React.CSSProperties}
            role="region"
            aria-label={current.p.title}
          >
            <button type="button" className="icon-btn look__close" onClick={() => setActive(null)} aria-label="Fermer">
              <Icon name="close" />
            </button>
            <QuickAdd product={current.p} compact />
          </div>
        ) : null}
      </div>
      <figcaption className="look__caption">
        <span className="t-h4">{look.title}</span>
        <span className="t-note">{look.note}</span>
      </figcaption>
    </figure>
  );
}
