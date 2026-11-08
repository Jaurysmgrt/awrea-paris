/**
 * Aperçu d'une pièce en brouillon ou archivée, sur la vraie page du site (/boutique/<adresse>).
 *
 * Seule la créatrice le voit : il faut à la fois le mode Édition (Draft Mode de Next.js, ouvert
 * depuis l'Atelier) et une session de l'Atelier (lib/edition/read.ts, isEditing). Une visiteuse,
 * même avec le cookie du Draft Mode, n'obtient jamais qu'une page introuvable. Une pièce en ligne ne
 * passe pas par ici : le site la lit comme d'habitude.
 *
 * Shopify relié sans accès Admin : la Storefront API ne renvoie pas les brouillons, il n'y a donc
 * pas d'aperçu (et l'Atelier ne les liste pas).
 */
import "server-only";
import { isEditing } from "@/lib/edition/read";
import { adminEnabled, shopifyApercuPiece } from "@/lib/shopify/admin";
import { mapProduct } from "@/lib/shopify/storefront";
import { demoProducts } from "./catalog-demo";
import { commerceMode } from "./index";
import { depuisShopify, type StatutPiece } from "./statut-pieces";
import type { Product } from "./types";

export interface Apercu {
  product: Product;
  statut: Exclude<StatutPiece, "en-ligne">;
}

const ADRESSE = /^[a-z0-9][a-z0-9-]{0,119}$/;

export async function pieceEnApercu(handle: string): Promise<Apercu | null> {
  if (!ADRESSE.test(handle) || !(await isEditing())) return null;
  if (adminEnabled) {
    const p = await shopifyApercuPiece(handle).catch((e) => {
      console.error("[apercu]", e);
      return null;
    });
    if (!p) return null;
    const statut = depuisShopify(p.status);
    return statut === "en-ligne" ? null : { product: mapProduct(p), statut };
  }
  if (commerceMode === "shopify") return null;
  const p = (await demoProducts({ tous: true })).find((x) => x.handle === handle);
  if (!p || p.statut === "en-ligne") return null;
  const { statut, ...product } = p;
  return { product, statut };
}
