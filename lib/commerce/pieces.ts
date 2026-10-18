/**
 * Réglages d'une pièce par la créatrice, depuis le tableau de bord Atelier : prix, délai de
 * fabrication et indicateurs « prix provisoire », « délai provisoire », « nouveau ».
 * Shopify Admin quand il est branché (prix des tailles et métachamps `awrea.*`), surcouches du
 * catalogue de démonstration sinon. Les deux pilotes donnent le même résultat à l'écran.
 */
import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { kv } from "@/lib/store";
import { adminEnabled, shopifyUpdatePiece } from "@/lib/shopify/admin";
import { formatPrice } from "@/lib/format";
import { DEMO_KEYS, type DemoFlags } from "./catalog-demo";
import { LEAD_TIME_BOUNDS, leadTimeText } from "./availability";
import { getProduct } from "./index";
import type { LeadTime } from "./types";

export interface PieceSettings {
  /** centimes */
  price?: number;
  priceProvisional?: boolean;
  leadTime?: LeadTime;
  leadTimeProvisional?: boolean;
  isNew?: boolean;
}

export class PieceError extends Error {}

export async function updatePiece(handle: string, s: PieceSettings): Promise<{ summary: string; title: string }> {
  const p = await getProduct(handle);
  if (!p) throw new PieceError("Cette pièce n’existe pas.");
  if (s.price !== undefined && (!Number.isInteger(s.price) || s.price <= 0)) throw new PieceError("Le prix doit être un montant positif.");
  if (s.leadTime) {
    const { min, max } = s.leadTime;
    const ok = Number.isInteger(min) && Number.isInteger(max) && min >= LEAD_TIME_BOUNDS.min && max <= LEAD_TIME_BOUNDS.max && min <= max;
    if (!ok) throw new PieceError(`Le délai va de ${LEAD_TIME_BOUNDS.min} à ${LEAD_TIME_BOUNDS.max} semaines, le plus court d’abord.`);
  }

  if (adminEnabled) {
    await shopifyUpdatePiece(handle, s);
  } else {
    const [prices, leads, flags] = await Promise.all([
      kv.get<Record<string, number>>(DEMO_KEYS.price),
      kv.get<Record<string, LeadTime>>(DEMO_KEYS.leadTime),
      kv.get<Record<string, DemoFlags>>(DEMO_KEYS.flags),
    ]);
    const writes: Promise<unknown>[] = [];
    if (s.price !== undefined) writes.push(kv.set(DEMO_KEYS.price, { ...(prices ?? {}), [handle]: s.price }));
    if (s.leadTime) writes.push(kv.set(DEMO_KEYS.leadTime, { ...(leads ?? {}), [handle]: { min: s.leadTime.min, max: s.leadTime.max } }));
    const patch: DemoFlags = {
      ...(s.priceProvisional !== undefined ? { priceProvisional: s.priceProvisional } : {}),
      ...(s.leadTimeProvisional !== undefined ? { leadTimeProvisional: s.leadTimeProvisional } : {}),
      ...(s.isNew !== undefined ? { isNew: s.isNew } : {}),
    };
    if (Object.keys(patch).length) writes.push(kv.set(DEMO_KEYS.flags, { ...(flags ?? {}), [handle]: { ...(flags?.[handle] ?? {}), ...patch } }));
    await Promise.all(writes);
  }

  try {
    if (adminEnabled) revalidateTag("shopify", { expire: 0 });
    revalidatePath("/", "layout");
  } catch {
    /* hors contexte de requête (script) */
  }

  const parts = [
    s.price !== undefined && s.price !== p.price ? `prix ${formatPrice(p.price)} → ${formatPrice(s.price)}` : null,
    s.priceProvisional !== undefined && s.priceProvisional !== Boolean(p.priceProvisional) ? (s.priceProvisional ? "prix marqué provisoire" : "prix confirmé") : null,
    s.leadTime && (s.leadTime.min !== p.leadTime.min || s.leadTime.max !== p.leadTime.max) ? `délai ${leadTimeText(p.leadTime)} → ${leadTimeText(s.leadTime)}` : null,
    s.leadTimeProvisional !== undefined && s.leadTimeProvisional !== Boolean(p.leadTimeProvisional) ? (s.leadTimeProvisional ? "délai marqué provisoire" : "délai confirmé") : null,
    s.isNew !== undefined && s.isNew !== Boolean(p.isNew) ? (s.isNew ? "pastille « Nouveau » ajoutée" : "pastille « Nouveau » retirée") : null,
  ].filter(Boolean);
  return { title: p.title, summary: `${p.title} : ${parts.length ? parts.join(", ") : "aucun changement"}` };
}
