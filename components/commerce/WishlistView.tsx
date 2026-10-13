"use client";
import Link from "@/components/ui/Link";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/commerce/types";
import { useWishlist } from "./WishlistProvider";
import { QuickAdd } from "./QuickAdd";
import { wishlist as copy } from "@/content/fr/pages";

export function WishlistView() {
  const { handles } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    if (!handles.length) {
      setProducts([]);
      return;
    }
    fetch(`/api/products?handles=${handles.join(",")}`)
      .then((r) => r.json())
      .then((j) => setProducts(handles.map((h) => (j.products as Product[]).find((p) => p.handle === h)).filter(Boolean) as Product[]));
  }, [handles]);

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
