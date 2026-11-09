/**
 * Réglages d'une pièce par la créatrice, depuis le tableau de bord Atelier : prix, délai de
 * fabrication et indicateurs « prix provisoire », « délai provisoire », « nouveau ».
 * Écrits dans la base de la boutique, par-dessus le catalogue de départ de la collection.
 *
 * Seuls les réglages qui changent sont écrits : décocher « provisoire » ne réécrit jamais le prix,
 * et une pièce dont les tailles ont des prix différents garde ces prix (le changement de prix est
 * alors refusé, avec une explication).
 */
import "server-only";
import { kv } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { DEMO_KEYS, type DemoPieceSettings } from "./catalog-demo";
import { LEAD_TIME_BOUNDS, leadTimeText } from "./availability";
import { lirePiece, rafraichirCatalogue } from "./atelier-catalogue";
import { changedSettings, type PieceSettings } from "./piece-settings";

export { changedSettings, type PieceSettings };

export class PieceError extends Error {}

/** Message de l'Atelier quand les tailles d'une pièce n'ont pas toutes le même prix. */
export const MIXED_PRICES_MESSAGE = "Les tailles de cette pièce n’ont pas toutes le même prix : un prix unique les écraserait, il n’est donc pas appliqué.";

export async function updatePiece(handle: string, settings: PieceSettings): Promise<{ summary: string; title: string }> {
  // en ligne, en brouillon ou archivée : une pièce se règle avant d'être mise en ligne
  const p = await lirePiece(handle);
  if (!p) throw new PieceError("Cette pièce n’existe pas.");
  if (settings.price !== undefined && (!Number.isInteger(settings.price) || settings.price <= 0)) throw new PieceError("Le prix doit être un montant positif.");
  if (settings.leadTime) {
    const { min, max } = settings.leadTime;
    const ok = Number.isInteger(min) && Number.isInteger(max) && min >= LEAD_TIME_BOUNDS.min && max <= LEAD_TIME_BOUNDS.max && min <= max;
    if (!ok) throw new PieceError(`Le délai va de ${LEAD_TIME_BOUNDS.min} à ${LEAD_TIME_BOUNDS.max} semaines, le plus court d’abord.`);
  }
  const s = changedSettings(p, settings);
  if (!Object.keys(s).length) return { title: p.title, summary: `${p.title} : aucun changement` };
  // tailles à des prix différents : jamais remplacées par un prix unique
  if (s.price !== undefined && p.priceVaries) throw new PieceError(MIXED_PRICES_MESSAGE);

  {
    // prix dans sa surcouche, délai et indicateurs dans celle des fiches
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

  rafraichirCatalogue(handle);

  const parts = [
    s.price !== undefined ? `prix ${formatPrice(p.price)} → ${formatPrice(s.price)}` : null,
    s.priceProvisional !== undefined ? (s.priceProvisional ? "prix marqué provisoire" : "prix confirmé") : null,
    s.leadTime ? `délai ${leadTimeText(p.leadTime)} → ${leadTimeText(s.leadTime)}` : null,
    s.leadTimeProvisional !== undefined ? (s.leadTimeProvisional ? "délai marqué provisoire" : "délai confirmé") : null,
    s.isNew !== undefined ? (s.isNew ? "pastille « Nouveau » ajoutée" : "pastille « Nouveau » retirée") : null,
  ].filter(Boolean);
  return { title: p.title, summary: `${p.title} : ${parts.join(", ")}` };
}
