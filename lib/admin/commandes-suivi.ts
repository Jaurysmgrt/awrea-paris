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
import { gestesPossibles, historique, type EvenementHistorique, type GesteCommande, type NoteInterne } from "./commandes";
import { getOrdersWithSource } from "@/lib/commerce/orders";
import { ArgentError } from "@/lib/commerce/argent";

export { gestesPossibles, type GesteCommande };

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
    evenements.push({ at: a.date, quoi: a.summary, par: AUTEUR[a.agent] ?? "Un agent" });
  }
  return historique(evenements);
}

/**
 * Geste d'argent demandé par la créatrice depuis la fiche, après confirmation. Jamais un outil de
 * l'assistant ni d'un agent : ils passent par perform() et les propositions à valider. Le verrou et
 * le refus d'un second remboursement sont dans l'exécuteur (lib/commerce/argent.ts), communs à tous
 * les chemins. Ici : la commande est bien celle que la créatrice a sous les yeux (même identifiant,
 * même montant).
 */
export async function faireGeste(numero: string, demande: { geste: GesteCommande; id: string; total: number }, par: string): Promise<string> {
  const { orders } = await getOrdersWithSource();
  const n = numero.trim().toUpperCase();
  const order = orders.find((o) => o.number.toUpperCase() === n);
  if (!order) throw new SuiviError("Cette commande n’existe pas.");
  if (order.id !== demande.id || order.total !== demande.total) throw new SuiviError("La commande a changé depuis l’ouverture de la page : rechargez-la avant de recommencer.");
  if (!gestesPossibles(order).includes(demande.geste)) throw new SuiviError("Ce geste n’est plus possible à cette étape de la commande. Rechargez la page.");
  const cible = { type: "order", id: order.id, label: order.number, href: `atelier:/commandes/${encodeURIComponent(order.number)}` };
  try {
    const r = demande.geste === "annuler-rembourser" ? await EXECUTORS.cancel_order({ orderId: order.id, refund: true }) : await EXECUTORS.refund_order({ orderId: order.id, reason: "Remboursement décidé par l’atelier" });
    await logAction({ agent: "systeme", kind: demande.geste === "rembourser" ? "refund_order" : "cancel_order", status: "done", summary: `Par l’atelier (${par}) · ${r.summary}`, target: cible }).catch((e) => console.error("[atelier/commandes] journal", e));
    return r.summary;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logAction({ agent: "systeme", kind: demande.geste === "rembourser" ? "refund_order" : "cancel_order", status: "failed", summary: `Par l’atelier (${par}) · geste sur ${order.number} non confirmé`, detail: message, target: cible }).catch(() => {});
    if (e instanceof ArgentError || /déjà remboursée/.test(message)) throw new SuiviError(message);
    throw new SuiviError(`Le geste n’a pas pu être confirmé (${message}). Vérifiez la commande avant de réessayer : une commande remboursée ne l’est jamais deux fois.`);
  }
}
