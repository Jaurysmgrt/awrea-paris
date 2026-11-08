/**
 * Suivi d'une commande dans l'Atelier (lot 3) : notes internes de la créatrice (jamais vues par la
 * cliente), historique (étapes franchies, notes, actions de l'atelier et des agents) et gestes
 * d'argent : annuler et rembourser, ou rembourser. Ces gestes passent par les mêmes exécuteurs que
 * les propositions validées (lib/agents/actions.ts), un seul à la fois par commande, après une
 * confirmation dans l'Atelier ; chacun est consigné au journal.
 */
import "server-only";
import { kv } from "@/lib/store";
import { EXECUTORS } from "@/lib/agents/actions";
import { getLog, logAction } from "@/lib/agents/log";
import { statusLabel } from "@/lib/commerce/orders";
import type { Order, OrderStage } from "@/lib/commerce/types";
import { historique, type EvenementHistorique, type NoteInterne } from "./commandes";

const cleNotes = (orderId: string) => `commandes:notes:${orderId}`;
export const NOTE_MAX = 2000;

export class SuiviError extends Error {}

export async function notesDe(orderId: string): Promise<NoteInterne[]> {
  return kv.list<NoteInterne>(cleNotes(orderId), 200);
}

export async function ajouterNote(order: Pick<Order, "id" | "number">, texte: string, par: string): Promise<NoteInterne> {
  const t = texte.trim();
  if (!t) throw new SuiviError("La note est vide.");
  if (t.length > NOTE_MAX) throw new SuiviError(`Une note compte ${NOTE_MAX} caractères au plus.`);
  const note: NoteInterne = { texte: t, par, at: new Date().toISOString() };
  await kv.push(cleNotes(order.id), note, 200);
  return note;
}

const ETAPE_LABEL: Record<OrderStage, string> = {
  paid: statusLabel.paid,
  in_production: statusLabel.in_production,
  ready: statusLabel.ready,
  shipped: statusLabel.shipped,
  delivered: statusLabel.delivered,
};

const AUTEUR: Record<string, string> = { systeme: "L’atelier" };

/** Historique d'une commande : sa création, ses étapes, les notes, les actions qui la visent. */
export async function historiqueDe(order: Order, notes?: NoteInterne[]): Promise<EvenementHistorique[]> {
  const [lesNotes, journal] = await Promise.all([notes ?? notesDe(order.id), getLog(2000)]);
  const evenements: EvenementHistorique[] = [{ at: order.createdAt, quoi: "Commande passée", par: "La cliente" }];
  for (const [etape, at] of Object.entries(order.stages ?? {}) as [OrderStage, string][]) {
    if (at && etape !== "paid") evenements.push({ at, quoi: ETAPE_LABEL[etape] });
  }
  for (const n of lesNotes) evenements.push({ at: n.at, quoi: `Note : ${n.texte}`, par: n.par });
  for (const a of journal) {
    if (a.target?.type !== "order" || (a.target.id !== order.id && a.target.label !== order.number)) continue;
    if (a.status === "info" && a.kind === "commande") continue; // doublon de « Commande passée »
    evenements.push({ at: a.date, quoi: a.summary, par: AUTEUR[a.agent] ?? (a.agent === "systeme" ? undefined : "Un agent") });
  }
  return historique(evenements);
}

export type GesteCommande = "annuler-rembourser" | "rembourser";

/** Ce qu'il est possible de faire, selon l'étape : rien sur une commande déjà remboursée. */
export function gestesPossibles(order: Pick<Order, "status">): GesteCommande[] {
  if (order.status === "refunded" || order.status === "pending") return [];
  if (order.status === "delivered" || order.status === "returned") return ["rembourser"];
  if (order.status === "shipped") return [];
  return ["annuler-rembourser"];
}

/**
 * Geste d'argent sur une commande, demandé par la créatrice après confirmation. Un seul geste à la
 * fois par commande (verrou de 10 minutes) : un double clic ne rembourse jamais deux fois.
 */
export async function faireGeste(order: Order, geste: GesteCommande, par: string): Promise<string> {
  if (!gestesPossibles(order).includes(geste)) throw new SuiviError("Ce geste n’est plus possible à cette étape de la commande. Rechargez la page.");
  if ((await kv.incr(`commandes:geste:${order.id}`, 600)) !== 1) throw new SuiviError("Un geste est déjà en cours sur cette commande.");
  const r =
    geste === "annuler-rembourser"
      ? await EXECUTORS.cancel_order({ orderId: order.number, refund: true })
      : await EXECUTORS.refund_order({ orderId: order.number, reason: "Remboursement décidé par l’atelier" });
  await logAction({ agent: "systeme", kind: geste === "rembourser" ? "refund_order" : "cancel_order", status: "done", summary: `Par l’atelier (${par}) · ${r.summary}`, target: { type: "order", id: order.id, label: order.number, href: `atelier:/commandes/${encodeURIComponent(order.number)}` } }).catch((e) =>
    console.error("[atelier/commandes] journal", e),
  );
  return r.summary;
}
