/**
 * Rôles du service : retours et échanges, logistique, avis clientes. Ils lisent les commandes, les
 * retours et les avis, signalent ce qui attend, et ne décident jamais d'un remboursement : celui-ci
 * reste une proposition validée par la créatrice (lib/agents/policy.ts).
 */
import { listReturns } from "@/lib/returns";
import { getOrders } from "@/lib/commerce/orders";
import { withStages } from "@/lib/store/order-stages";
import { listReviews } from "@/lib/reviews";
import type { Finding, RoleOutcome } from "./types";

const DAY = 86_400_000;
const days = (from: string, now: Date) => Math.floor((now.getTime() - new Date(from).getTime()) / DAY);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** jours ouvrés écoulés (du lundi au vendredi) */
function workingDays(from: string, now: Date): number {
  let n = 0;
  const d = new Date(from);
  while (d < now) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d <= now && d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n++;
  }
  return n;
}

export async function runRetours(now = new Date()): Promise<RoleOutcome> {
  const all = await listReturns();
  const findings: Finding[] = [];
  for (const r of all) {
    if (r.status === "demande" && days(r.createdAt, now) >= 7) findings.push({ gravite: "attention", titre: `Retour ${r.id} demandé il y a ${days(r.createdAt, now)} jours, colis pas encore reçu`, detail: `${r.name}, commande ${r.orderNumber}.`, lien: "/retours", cible: r.id });
    if (r.labelPending) findings.push({ gravite: "urgent", titre: `Retour ${r.id} sans étiquette`, detail: "Déposez l’étiquette dans la fiche du retour pour que la cliente puisse renvoyer sa pièce.", lien: "/retours", cible: `${r.id}:etiquette` });
    if (r.status === "recu" && days(r.updatedAt, now) >= 2) findings.push({ gravite: "urgent", titre: `Retour ${r.id} reçu depuis ${days(r.updatedAt, now)} jours`, detail: r.items.some((i) => i.wish === "echange") ? "Un échange attend son envoi." : "Le remboursement attend votre accord dans les Validations (14 jours au plus après réception).", lien: r.items.some((i) => i.wish === "echange") ? "/retours" : "/validations", cible: `${r.id}:recu` });
  }
  const open = all.filter((r) => r.status === "demande" || r.status === "recu").length;
  return { resume: open ? `${plural(open, "retour en cours", "retours en cours")}, ${plural(findings.length, "point à regarder", "points à regarder")}.` : "Aucun retour en cours.", findings };
}

/**
 * Expéditions : une pièce prête part sous quelques jours ouvrés, puis la livraison en France
 * métropolitaine intervient en 5 à 10 jours ouvrés (article 5 des conditions générales de vente).
 * La confection elle-même est suivie par le rôle Confection et l'agent Commandes et confection.
 */
export const SHIPPING_RULES = { readyWithinWorkingDays: 5, deliveryWorkingDays: 10 } as const;

export async function runLogistique(now = new Date()): Promise<RoleOutcome> {
  const orders = await withStages(await getOrders());
  const findings: Finding[] = [];
  for (const o of orders) {
    const ready = o.stages?.ready;
    const shipped = o.stages?.shipped ?? o.createdAt;
    if (o.status === "ready" && !o.shipping.pickup && ready && workingDays(ready, now) > SHIPPING_RULES.readyWithinWorkingDays) findings.push({ gravite: "urgent", titre: `Commande ${o.number} prête depuis ${workingDays(ready, now)} jours ouvrés, pas encore expédiée`, detail: "La pièce est prête : la cliente attend son colis.", lien: `/commandes/${o.number}`, cible: o.number });
    if (o.status === "shipped" && !o.shipping.tracking) findings.push({ gravite: "attention", titre: `Commande ${o.number} expédiée sans numéro de suivi`, detail: "La cliente ne peut pas suivre son colis.", lien: `/commandes/${o.number}`, cible: `${o.number}:suivi` });
    if (o.status === "shipped" && workingDays(shipped, now) > SHIPPING_RULES.deliveryWorkingDays) findings.push({ gravite: "attention", titre: `Commande ${o.number} en route depuis ${workingDays(shipped, now)} jours ouvrés`, detail: "Les conditions générales de vente prévoient une livraison en 5 à 10 jours ouvrés : vérifiez le suivi auprès du transporteur.", lien: `/commandes/${o.number}`, cible: `${o.number}:route` });
    if (o.status === "blocked") findings.push({ gravite: "urgent", titre: `Commande ${o.number} bloquée`, lien: `/commandes/${o.number}`, cible: `${o.number}:bloquee` });
  }
  const toShip = orders.filter((o) => o.status === "ready").length;
  return { resume: `${plural(toShip, "commande prête à expédier", "commandes prêtes à expédier")}, ${plural(findings.length, "point", "points")} à regarder.`, findings };
}

export async function runAvis(now = new Date()): Promise<RoleOutcome> {
  const pending = await listReviews("pending");
  const findings: Finding[] = [];
  for (const r of pending) {
    const age = days(r.createdAt, now);
    const fit = r.fit && r.fit !== "juste";
    if (age >= 3 || fit) findings.push({ gravite: age >= 7 ? "attention" : "info", titre: `Avis sur ${r.productHandle} en attente depuis ${age} jour${age > 1 ? "s" : ""}`, detail: fit ? "La cliente signale une taille qui ne tombe pas juste : une réponse de votre main rassure les suivantes." : undefined, lien: "/avis", cible: r.id });
  }
  return { resume: pending.length ? `${plural(pending.length, "avis attend", "avis attendent")} votre lecture.` : "Aucun avis en attente.", findings };
}
