/**
 * Disponibilité d'une pièce dans le modèle de la Maison : chaque pièce est créée sur demande,
 * sans stock. Elle se commande donc toujours, dans toutes ses tailles, et la seule information à
 * donner est son délai de fabrication (« 2 à 3 semaines »).
 *
 * Module pur : utilisable côté serveur comme dans le navigateur.
 */
import type { Category, LeadTime, Product } from "./types";

/**
 * Délais de fabrication PROVISOIRES par catégorie, à confirmer par la Maison (ACTIVATION.md) :
 * bodys et tops 2 à 3 semaines, robes 3 à 4 semaines. Servent aussi de repli quand une pièce
 * Shopify n'a pas encore ses métachamps de délai.
 */
export const DEFAULT_LEAD_TIME: Record<Category, LeadTime> = {
  body: { min: 2, max: 3 },
  top: { min: 2, max: 3 },
  robe: { min: 3, max: 4 },
  jupe: { min: 2, max: 3 },
  accessoire: { min: 2, max: 3 },
};

/** Bornes acceptées pour un délai, en semaines (contrôle des saisies de l'Atelier et de Shopify). */
export const LEAD_TIME_BOUNDS = { min: 1, max: 26 } as const;

/** Modèles de texte du délai (document de contenu « catalogue », clé `delai`). */
export interface LeadTimeTemplates {
  /** « {min} à {max} semaines » */
  plage: string;
  /** « {n} semaines » */
  fixe: string;
  /** « 1 semaine » */
  une: string;
}

const FR: LeadTimeTemplates = { plage: "{min} à {max} semaines", fixe: "{n} semaines", une: "1 semaine" };

const put = (tpl: string, vars: Record<string, number>) => tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** Délai cohérent : entiers, dans les bornes, minimum ≤ maximum. */
export function normalizeLeadTime(min: number | null | undefined, max: number | null | undefined, fallback: LeadTime): LeadTime {
  const clamp = (n: number) => Math.min(LEAD_TIME_BOUNDS.max, Math.max(LEAD_TIME_BOUNDS.min, Math.round(n)));
  const a = Number.isFinite(min) ? clamp(min as number) : null;
  const b = Number.isFinite(max) ? clamp(max as number) : null;
  if (a === null && b === null) return fallback;
  const lo = a ?? b!;
  const hi = b ?? a!;
  return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
}

/** Délai lisible : « 2 à 3 semaines », « 3 semaines », « 1 semaine ». */
export function leadTimeText(t: LeadTime, tpl: LeadTimeTemplates = FR): string {
  if (t.min === t.max) return t.min === 1 ? tpl.une : put(tpl.fixe, { n: t.min });
  return put(tpl.plage, { min: t.min, max: t.max });
}

/** Délai le plus long d'un ensemble de pièces : une commande part quand sa dernière pièce est prête. */
export function longestLeadTime(list: LeadTime[]): LeadTime | null {
  if (!list.length) return null;
  return { min: Math.max(...list.map((t) => t.min)), max: Math.max(...list.map((t) => t.max)) };
}

/** Phrase courte et factuelle (agents, assistante, flux, llms.txt) : « créée sur demande, 2 à 3 semaines de fabrication ». */
export function madeToOrderLabel(p: Pick<Product, "leadTime">): string {
  return `créée sur demande, ${leadTimeText(p.leadTime)} de fabrication`;
}
