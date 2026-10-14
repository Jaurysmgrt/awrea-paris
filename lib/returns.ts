/**
 * Retours et échanges de taille en libre-service.
 *
 * - La cliente ouvre sa commande par son lien signé (suivi sans compte), choisit les pièces, la
 *   raison, puis un remboursement ou une autre taille ; elle reçoit aussitôt son étiquette de retour.
 * - Délai : `shop.returnDays` jours après la livraison ; pièce non portée, avec son certificat.
 *   Les pièces sur mesure sont exclues (CGV).
 * - L'atelier réceptionne le colis dans l'Atelier ; le remboursement touche à l'argent : il part en
 *   proposition à valider par la créatrice (lib/agents/policy.ts), l'avoir est alors émis. L'échange
 *   réserve la nouvelle taille et part sans validation (aucun mouvement d'argent).
 * - Étiquette : interrupteur LABELS_PROVIDER (lib/config/providers.ts) — Sendcloud si branché,
 *   sinon une étiquette de démonstration ; si le prestataire échoue, l'atelier est prévenu et
 *   dépose lui-même l'étiquette dans l'Atelier (envoyée à la cliente par e-mail).
 */
import "server-only";
import { kv } from "@/lib/store";
import { shop } from "@/content/settings";
import type { Order, Size } from "@/lib/commerce/types";

export type ReturnReason = "trop-petite" | "trop-grande" | "tombe" | "matiere" | "autre";
export type ReturnStatus = "demande" | "recu" | "rembourse" | "echange-expedie" | "refuse";

export const reasonLabel: Record<ReturnReason, string> = {
  "trop-petite": "Taille trop petite",
  "trop-grande": "Taille trop grande",
  tombe: "Le tombé ne me convient pas",
  matiere: "La matière ne correspond pas à mon attente",
  autre: "Autre raison",
};

export const statusLabel: Record<ReturnStatus, string> = {
  demande: "Retour demandé — en attente du colis",
  recu: "Colis reçu à l’atelier",
  rembourse: "Remboursée",
  "echange-expedie": "Nouvelle taille expédiée",
  refuse: "Retour refusé",
};

export interface ReturnItem {
  handle: string;
  title: string;
  size: Size;
  unitPrice: number;
  reason: ReturnReason;
  wish: "remboursement" | "echange";
  exchangeSize?: Size;
}

export interface ReturnLabel {
  provider: "mock" | "colissimo" | "atelier";
  carrier: string;
  tracking: string;
  /** identifiant du PDF dans le stockage (étiquette déposée par l'atelier ou reçue du prestataire) */
  mediaId?: string;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderNumber: string;
  orderId: string;
  email: string;
  name: string;
  items: ReturnItem[];
  comment?: string;
  status: ReturnStatus;
  label?: ReturnLabel;
  /** l'étiquette n'a pas pu être obtenue : l'atelier la dépose */
  labelPending?: boolean;
  proposalId?: string;
  createdAt: string;
  updatedAt: string;
}

const KEY = "returns";
const COUNTERS = "returns:counters";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function listReturns(): Promise<ReturnRequest[]> {
  return ((await kv.get<ReturnRequest[]>(KEY)) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReturn(id: string): Promise<ReturnRequest | null> {
  return (await listReturns()).find((r) => r.id === id) ?? null;
}

export async function returnsOf(orderNumber: string): Promise<ReturnRequest[]> {
  return (await listReturns()).filter((r) => r.orderNumber === orderNumber);
}

export async function saveReturn(r: ReturnRequest) {
  const all = (await kv.get<ReturnRequest[]>(KEY)) ?? [];
  await kv.set(KEY, [{ ...r, updatedAt: new Date().toISOString() }, ...all.filter((x) => x.id !== r.id)]);
}

async function nextId(): Promise<string> {
  const lock = "returns:lock";
  for (let i = 0; (await kv.incr(lock, 10)) > 1; i++) {
    if (i > 50) throw new Error("retours : verrou occupé");
    await sleep(100);
  }
  try {
    const year = new Date().getFullYear();
    const counters = (await kv.get<Record<string, number>>(COUNTERS)) ?? {};
    const next = (counters[year] ?? 0) + 1;
    await kv.set(COUNTERS, { ...counters, [year]: next });
    return `R-${year}-${String(next).padStart(4, "0")}`;
  } finally {
    await kv.del(lock);
  }
}

/** Date limite de retour : livraison (ou, à défaut, commande et délai d'acheminement) + délai légal de la maison. */
export function returnDeadline(order: Order): Date {
  const base = new Date(order.deliveredAt ?? order.createdAt);
  if (!order.deliveredAt) base.setDate(base.getDate() + 7);
  base.setDate(base.getDate() + shop.returnDays);
  return base;
}

/** Pièces encore retournables : livrées (ou expédiées), dans le délai, pas déjà retournées, hors sur-mesure. */
export async function returnable(order: Order): Promise<{ eligible: boolean; reason?: string; lines: Order["lines"] }> {
  if (!["shipped", "delivered"].includes(order.status)) return { eligible: false, reason: "Le retour s’ouvre dès l’expédition de la commande.", lines: [] };
  if (returnDeadline(order) < new Date()) return { eligible: false, reason: `Le délai de retour de ${shop.returnDays} jours après la livraison est dépassé. Écrivez-nous : l’atelier trouvera une solution.`, lines: [] };
  const done = (await returnsOf(order.number)).filter((r) => r.status !== "refuse").flatMap((r) => r.items);
  const left = order.lines.filter((l) => !l.handle.startsWith("sur-mesure")).filter((l) => {
    const already = done.filter((d) => d.handle === l.handle && d.size === l.size).length;
    const bought = order.lines.filter((x) => x.handle === l.handle && x.size === l.size).reduce((s, x) => s + x.quantity, 0);
    return already < bought;
  });
  return left.length ? { eligible: true, lines: left } : { eligible: false, reason: "Toutes les pièces de cette commande font déjà l’objet d’un retour.", lines: [] };
}

export async function createReturn(order: Order, items: ReturnItem[], comment?: string): Promise<ReturnRequest> {
  const now = new Date().toISOString();
  const r: ReturnRequest = {
    id: await nextId(),
    orderNumber: order.number,
    orderId: order.id,
    email: order.email,
    name: order.address ? `${order.address.firstName} ${order.address.lastName}` : order.name,
    items,
    comment: comment?.trim() || undefined,
    status: "demande",
    createdAt: now,
    updatedAt: now,
  };
  await saveReturn(r);
  return r;
}
