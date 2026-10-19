/**
 * Réglages d'une pièce par la créatrice, depuis le tableau de bord Atelier : prix, délai de
 * fabrication et indicateurs « prix provisoire », « délai provisoire », « nouveau ».
 * Shopify Admin quand il est branché (prix des tailles et métachamps `awrea.*`), surcouches du
 * catalogue de démonstration sinon. Les deux pilotes donnent le même résultat à l'écran.
 *
 * Seuls les réglages qui changent sont écrits : décocher « provisoire » ne réécrit jamais le prix,
 * et une pièce Shopify dont les tailles ont des prix différents garde ces prix (le changement de
 * prix est alors refusé, avec une explication).
 */
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { kv } from "@/lib/store";
import { adminEnabled, MixedPricesError, shopifyUpdatePiece } from "@/lib/shopify/admin";
import { formatPrice } from "@/lib/format";
import { DEMO_KEYS, type DemoPieceSettings } from "./catalog-demo";
import { LEAD_TIME_BOUNDS, leadTimeText } from "./availability";
import { getProduct } from "./index";
import type { LeadTime, Product } from "./types";

export interface PieceSettings {
  /** centimes */
  price?: number;
  priceProvisional?: boolean;
  leadTime?: LeadTime;
  leadTimeProvisional?: boolean;
  isNew?: boolean;
}

export class PieceError extends Error {}

/** Message de l'Atelier quand les tailles d'une pièce Shopify n'ont pas toutes le même prix. */
export const MIXED_PRICES_MESSAGE = "Les tailles de cette pièce n’ont pas toutes le même prix dans Shopify. Pour ne pas les écraser, modifiez ces prix directement dans Shopify.";

/** Réglages réellement différents de ceux de la pièce : rien d'autre n'est écrit. */
export function changedSettings(p: Pick<Product, "price" | "priceProvisional" | "leadTime" | "leadTimeProvisional" | "isNew">, s: PieceSettings): PieceSettings {
  return {
    ...(s.price !== undefined && s.price !== p.price ? { price: s.price } : {}),
    ...(s.priceProvisional !== undefined && s.priceProvisional !== Boolean(p.priceProvisional) ? { priceProvisional: s.priceProvisional } : {}),
    ...(s.leadTime && (s.leadTime.min !== p.leadTime.min || s.leadTime.max !== p.leadTime.max) ? { leadTime: { min: s.leadTime.min, max: s.leadTime.max } } : {}),
    ...(s.leadTimeProvisional !== undefined && s.leadTimeProvisional !== Boolean(p.leadTimeProvisional) ? { leadTimeProvisional: s.leadTimeProvisional } : {}),
    ...(s.isNew !== undefined && s.isNew !== Boolean(p.isNew) ? { isNew: s.isNew } : {}),
  };
}

export async function updatePiece(handle: string, settings: PieceSettings): Promise<{ summary: string; title: string }> {
  const p = await getProduct(handle);
  if (!p) throw new PieceError("Cette pièce n’existe pas.");
  if (settings.price !== undefined && (!Number.isInteger(settings.price) || settings.price <= 0)) throw new PieceError("Le prix doit être un montant positif.");
  if (settings.leadTime) {
    const { min, max } = settings.leadTime;
    const ok = Number.isInteger(min) && Number.isInteger(max) && min >= LEAD_TIME_BOUNDS.min && max <= LEAD_TIME_BOUNDS.max && min <= max;
    if (!ok) throw new PieceError(`Le délai va de ${LEAD_TIME_BOUNDS.min} à ${LEAD_TIME_BOUNDS.max} semaines, le plus court d’abord.`);
  }
  const s = changedSettings(p, settings);
  if (!Object.keys(s).length) return { title: p.title, summary: `${p.title} : aucun changement` };
  // tailles à des prix différents (Shopify) : jamais remplacées par un prix unique
  if (s.price !== undefined && p.priceVaries) throw new PieceError(MIXED_PRICES_MESSAGE);

  if (adminEnabled) {
    try {
      await shopifyUpdatePiece(handle, s);
    } catch (e) {
      if (e instanceof MixedPricesError) throw new PieceError(MIXED_PRICES_MESSAGE);
      throw e;
    }
  } else {
    // démonstration : prix dans sa surcouche, délai et indicateurs dans celle des fiches
    // (effacées ensemble par la remise à zéro de la démonstration)
    const [prices, patches] = await Promise.all([kv.get<Record<string, number>>(DEMO_KEYS.price), kv.get<Record<string, DemoPieceSettings>>(DEMO_KEYS.patches)]);
    const writes: Promise<unknown>[] = [];
    if (s.price !== undefined) writes.push(kv.set(DEMO_KEYS.price, { ...(prices ?? {}), [handle]: s.price }));
    const patch: DemoPieceSettings = {
      ...(s.leadTime ? { leadTime: s.leadTime } : {}),
      ...(s.priceProvisional !== undefined ? { priceProvisional: s.priceProvisional } : {}),
      ...(s.leadTimeProvisional !== undefined ? { leadTimeProvisional: s.leadTimeProvisional } : {}),
      ...(s.isNew !== undefined ? { isNew: s.isNew } : {}),
    };
    if (Object.keys(patch).length) writes.push(kv.set(DEMO_KEYS.patches, { ...(patches ?? {}), [handle]: { ...(patches?.[handle] ?? {}), ...patch } }));
    await Promise.all(writes);
  }

  try {
    if (adminEnabled) revalidateTag("shopify", { expire: 0 });
    revalidatePath("/", "layout");
  } catch {
    /* hors contexte de requête (script) */
  }

  const parts = [
    s.price !== undefined ? `prix ${formatPrice(p.price)} → ${formatPrice(s.price)}` : null,
    s.priceProvisional !== undefined ? (s.priceProvisional ? "prix marqué provisoire" : "prix confirmé") : null,
    s.leadTime ? `délai ${leadTimeText(p.leadTime)} → ${leadTimeText(s.leadTime)}` : null,
    s.leadTimeProvisional !== undefined ? (s.leadTimeProvisional ? "délai marqué provisoire" : "délai confirmé") : null,
    s.isNew !== undefined ? (s.isNew ? "pastille « Nouveau » ajoutée" : "pastille « Nouveau » retirée") : null,
  ].filter(Boolean);
  return { title: p.title, summary: `${p.title} : ${parts.join(", ")}` };
}
