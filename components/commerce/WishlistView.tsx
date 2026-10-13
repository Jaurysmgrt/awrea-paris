"use client";
import Link from "@/components/ui/Link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/commerce/types";
import { useWishlist } from "./WishlistProvider";
import { QuickAdd } from "./QuickAdd";
import { wishlist as copy } from "@/content/fr/pages";

const noop = () => () => {};

export function WishlistView() {
  const { handles } = useWishlist();
  // la liste n'existe que dans le navigateur : « Chargement… » tant que la page s'hydrate
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const key = handles.join(",");
  const [fetched, setFetched] = useState<{ key: string; products: Product[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch(`/api/products?handles=${key}`)
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
  }, [key]);

  // une pièce retirée disparaît aussitôt ; une pièce ajoutée apparaît dès que sa fiche arrive
  const products = !hydrated ? null : !key ? [] : fetched ? fetched.products.filter((p) => handles.includes(p.handle)) : null;

  if (products === null) return <p className="t-note">Chargement…</p>;
  if (!products.length)
    return (
      <div className="stack-m">
        <p className="t-lead">{copy.empty}</p>
        <div>
          <Link href="/boutique" className="btn">
            Découvrir la boutique
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
