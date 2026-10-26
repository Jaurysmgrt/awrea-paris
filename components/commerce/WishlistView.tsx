"use client";
import Link from "@/components/ui/Link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/commerce/types";
import { useWishlist } from "./WishlistProvider";
import { QuickAdd } from "./QuickAdd";
import { useLocale } from "@/components/providers/LocaleProvider";

const noop = () => () => {};

/** Textes de la liste, lus par la page dans le document « liste-envies ». */
export type WishlistViewTexts = { chargement: string; vide: string; videLien: { label: string; href: string } };

export function WishlistView({ texts }: { texts: WishlistViewTexts }) {
  const { handles } = useWishlist();
  const locale = useLocale();
  // la liste n'existe que dans le navigateur : « Chargement… » tant que la page s'hydrate
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const key = handles.join(",");
  const [fetched, setFetched] = useState<{ key: string; products: Product[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    // fiches dans la langue de la page
    fetch(`/api/products?handles=${key}&langue=${locale}`)
      .then((r) => r.json())
      .then((j: { products: Product[] }) => {
        if (!alive) return;
        const list = key.split(",").map((h) => j.products.find((p) => p.handle === h)).filter((p): p is Product => Boolean(p));
        setFetched({ key, products: list });
      })
      .catch(() => alive && setFetched({ key, products: [] }));
    return () => {
      alive = false;
    };
  }, [key, locale]);

  // une pièce retirée disparaît aussitôt ; une pièce ajoutée apparaît dès que sa fiche arrive
  const products = !hydrated ? null : !key ? [] : fetched ? fetched.products.filter((p) => handles.includes(p.handle)) : null;

  if (products === null) return <p className="t-note">{texts.chargement}</p>;
  if (!products.length)
    return (
      <div className="stack-m">
        <p className="t-lead">{texts.vide}</p>
        <div>
          <Link href={texts.videLien.href} className="btn">
            {texts.videLien.label}
          </Link>
        </div>
      </div>
    );
  return (
    <ul className="complete-look">
      {products.map((p) => (
        <li key={p.handle}>
          <QuickAdd product={p} />
        </li>
      ))}
    </ul>
  );
}
