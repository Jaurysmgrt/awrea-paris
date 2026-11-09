/**
 * Aperçu d'une pièce en brouillon ou archivée, sur la vraie page du site (/boutique/<adresse>).
 *
 * Seule la créatrice le voit : il faut à la fois le mode Édition (Draft Mode de Next.js, ouvert
 * depuis l'Atelier) et une session de l'Atelier (lib/edition/read.ts, isEditing). Une visiteuse,
 * même avec le cookie du Draft Mode, n'obtient jamais qu'une page introuvable. Une pièce en ligne ne
 * passe pas par ici : le site la lit comme d'habitude.
 */
import "server-only";
import { cache } from "react";
import { isEditing } from "@/lib/edition/read";
import { demoProducts } from "./catalog-demo";
import type { StatutPiece } from "./statut-pieces";
import type { Product } from "./types";

export interface Apercu {
  product: Product;
  statut: Exclude<StatutPiece, "en-ligne">;
}

const ADRESSE = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Une seule lecture par requête : la page et ses métadonnées la partagent. */
export const pieceEnApercu = cache(async (handle: string): Promise<Apercu | null> => {
  if (!ADRESSE.test(handle) || !(await isEditing())) return null;
  const p = (await demoProducts({ tous: true })).find((x) => x.handle === handle);
  if (!p || p.statut === "en-ligne") return null;
  const { statut, ...product } = p;
  return { product, statut };
});
