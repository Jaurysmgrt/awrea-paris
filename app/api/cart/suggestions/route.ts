/**
 * Suggestions du panier : les pièces que la créatrice associe à celles du panier (« compléter le
 * look »), publiées, pas encore dans le panier, deux au plus (toutes se commandent : elles sont
 * créées sur demande). Rien de calculé sur la cliente.
 */
import { NextResponse } from "next/server";
import { readCart } from "@/lib/commerce/cart";
import { getPublicProducts } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function GET() {
  const [cart, products] = await Promise.all([readCart(), getPublicProducts()]);
  const inCart = new Set(cart.lines.map((l) => l.productHandle));
  const wanted = cart.lines.flatMap((l) => products.find((p) => p.handle === l.productHandle)?.completeTheLook ?? []);
  const seen = new Set<string>();
  const suggestions = wanted
    .filter((h) => !inCart.has(h) && !seen.has(h) && seen.add(h))
    .map((h) => products.find((p) => p.handle === h))
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.variants.length > 0)
    .slice(0, 2)
    .map((p) => ({ handle: p.handle, title: p.title, tagline: p.tagline, price: p.price, image: p.images[0] }));
  return NextResponse.json({ suggestions });
}
