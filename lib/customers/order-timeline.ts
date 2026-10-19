/**
 * Frise d'une commande créée sur demande : « Commande reçue », « En confection », « Prête »,
 * « Expédiée », « Livrée », la date de chaque étape franchie, et la date estimée de fin de
 * confection d'après le délai annoncé à la commande.
 *
 * Module pur (aucun accès au stockage) : partagé par le compte cliente, la page de suivi, la
 * confirmation de commande, l'Atelier et les e-mails de suivi, et couvert par les tests unitaires.
 */
import type { LeadTime, Order, OrderStage, OrderStatus } from "@/lib/commerce/types";

/** Les cinq étapes, dans l'ordre. */
export const ORDER_STAGES: readonly OrderStage[] = ["paid", "in_production", "ready", "shipped", "delivered"];

const DAY = 86_400_000;

export const isOrderStage = (s: string): s is OrderStage => (ORDER_STAGES as readonly string[]).includes(s);

/** Situation qui suspend ou clôt la frise (paiement attendu, commande en attente, retour, remboursement). */
export type OrderSituation = "pending" | "blocked" | "returned" | "refunded" | null;

export interface TimelineStep {
  stage: OrderStage;
  /** franchie, en cours (la dernière franchie), ou à venir */
  state: "done" | "current" | "todo";
  /** date du passage à cette étape, quand elle est connue */
  at: string | null;
}

export interface OrderTimeline {
  steps: TimelineStep[];
  /** rang de l'étape en cours (0 à 4), -1 tant que le paiement n'est pas confirmé */
  current: number;
  situation: OrderSituation;
  /** délai de fabrication annoncé (semaines) */
  leadTime: LeadTime | null;
  /** fin de confection estimée (du plus tôt au plus tard), tant que la pièce n'est pas prête */
  estimate: { from: string; to: string } | null;
  /** la confection dépasse le délai annoncé */
  late: boolean;
}

/** Rang de l'étape atteinte selon le statut de la commande. */
export function stageIndex(status: OrderStatus, stages: Order["stages"] = {}): number {
  if (isOrderStage(status)) return ORDER_STAGES.indexOf(status);
  if (status === "pending") return -1;
  if (status === "blocked") return 0;
  if (status === "returned") return ORDER_STAGES.length - 1;
  // remboursée : la frise s'arrête à la dernière étape datée
  const dated = ORDER_STAGES.map((s, i) => (stages[s] ? i : -1)).filter((i) => i >= 0);
  return dated.length ? Math.max(...dated) : 0;
}

const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

/** Date de départ de la confection : le passage à « Commande reçue » (à défaut, la date de commande). */
export const productionStart = (o: Pick<Order, "createdAt" | "stages">) => o.stages?.paid ?? o.createdAt;

/** Fin de confection estimée, du plus tôt au plus tard, d'après le délai annoncé. */
export function estimatedReady(o: Pick<Order, "createdAt" | "stages">, leadTime: LeadTime | null | undefined): { from: string; to: string } | null {
  if (!leadTime) return null;
  const start = productionStart(o);
  return { from: addDays(start, leadTime.min * 7), to: addDays(start, leadTime.max * 7) };
}

/**
 * Frise complète. `leadTime` : délai annoncé à la commande (`order.leadTime`) ou, pour une commande
 * plus ancienne, le plus long délai actuel de ses pièces.
 */
export function orderTimeline(o: Pick<Order, "status" | "createdAt" | "stages" | "deliveredAt" | "leadTime">, now: Date = new Date(), fallbackLeadTime: LeadTime | null = null): OrderTimeline {
  const stages = o.stages ?? {};
  const current = stageIndex(o.status, stages);
  const situation: OrderSituation = o.status === "pending" || o.status === "blocked" || o.status === "returned" || o.status === "refunded" ? o.status : null;
  const dateOf = (s: OrderStage): string | null => stages[s] ?? (s === "paid" && current >= 0 ? o.createdAt : s === "delivered" ? (o.deliveredAt ?? null) : null);
  const steps: TimelineStep[] = ORDER_STAGES.map((stage, i) => ({
    stage,
    state: i < current ? "done" : i === current ? "current" : "todo",
    at: i <= current ? dateOf(stage) : null,
  }));
  const leadTime = o.leadTime ?? fallbackLeadTime;
  // l'estimation n'a de sens que pendant la confection d'une commande qui suit son cours
  const making = situation === null && current >= 0 && current < ORDER_STAGES.indexOf("ready");
  const estimate = making ? estimatedReady(o, leadTime) : null;
  // en retard : le dernier jour annoncé est passé
  const late = Boolean(estimate && now.getTime() > new Date(estimate.to).getTime() + DAY);
  return { steps, current, situation, leadTime: leadTime ?? null, estimate, late };
}

/** Étape suivante d'une commande dans l'Atelier (aucune si elle est livrée, remboursée ou retournée). */
export function nextStage(status: OrderStatus): OrderStage | null {
  if (status === "pending") return "paid";
  if (!isOrderStage(status)) return null;
  return ORDER_STAGES[ORDER_STAGES.indexOf(status) + 1] ?? null;
}
