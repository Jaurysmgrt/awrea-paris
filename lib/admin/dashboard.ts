/**
 * Centre de pilotage de l'Atelier (brief de la créatrice du 03/11 et du 07/11) : les chiffres et les
 * priorités de la Vue d'ensemble, calculés ici sans rien inventer, à partir des seules données
 * réelles passées en paramètre. Fonctions pures (aucun accès au stockage ni au réseau) : la même
 * logique servira à AWREA ASSISTANT (« Combien ai-je gagné ce mois-ci ? », « Quelles sont les trois
 * choses à faire aujourd'hui ? ») et se teste seule (tests/unit/atelier-pilotage.test.ts).
 *
 * Dates : les mois et les jours sont ceux de Paris, quel que soit le fuseau du serveur.
 */
import type { Order } from "@/lib/commerce/types";

const DAY = 24 * 60 * 60 * 1000;
const PARIS = "Europe/Paris";

/** « 2026-11 » : le mois de Paris d'une date. */
export function parisMonthKey(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS, year: "numeric", month: "2-digit" }).formatToParts(d);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Jour du mois à Paris (1 à 31). */
export function parisDayOfMonth(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: PARIS, day: "numeric" }).format(d));
}

/** Mois précédent : « 2026-11 » → « 2026-10 », « 2026-01 » → « 2025-12 ». */
export function previousMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Une commande compte dans le chiffre d'affaires une fois payée, tant qu'elle n'est pas remboursée. */
export const isSale = (o: Pick<Order, "status">) => o.status !== "pending" && o.status !== "refunded";

export interface MonthRevenue {
  /** ventes du 1er du mois à aujourd'hui (Paris) */
  amount: number;
  count: number;
  /** mêmes jours du mois précédent, pour comparer à date égale */
  previousAmount: number;
  previousCount: number;
}

/** Chiffre d'affaires du mois en cours, comparé aux mêmes jours du mois précédent. */
export function monthRevenue(orders: Pick<Order, "status" | "total" | "createdAt">[], now: Date): MonthRevenue {
  const key = parisMonthKey(now);
  const prev = previousMonthKey(key);
  const today = parisDayOfMonth(now);
  const out: MonthRevenue = { amount: 0, count: 0, previousAmount: 0, previousCount: 0 };
  for (const o of orders) {
    if (!isSale(o)) continue;
    const d = new Date(o.createdAt);
    const k = parisMonthKey(d);
    if (k === key) {
      out.amount += o.total;
      out.count++;
    } else if (k === prev && parisDayOfMonth(d) <= today) {
      out.previousAmount += o.total;
      out.previousCount++;
    }
  }
  return out;
}

/** Évolution en pour cent, ou null quand il n'y a rien à comparer. */
export function evolution(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Commandes qui attendent un geste de la Maison : reçues (à mettre en confection) et prêtes (à expédier). */
export function ordersToHandle<T extends Pick<Order, "status">>(orders: T[]): { received: T[]; ready: T[] } {
  return { received: orders.filter((o) => o.status === "paid"), ready: orders.filter((o) => o.status === "ready") };
}

/** Les dernières commandes payées ou en attente de paiement, les plus récentes d'abord. */
export function latestOrders<T extends Pick<Order, "createdAt">>(orders: T[], n = 5): T[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, n);
}

/** Pièces les plus vendues sur la période (quantités), hors commandes non payées ou remboursées. */
export function topSold(orders: Pick<Order, "status" | "createdAt" | "lines">[], now: Date, days = 90, n = 3): { handle: string; title: string; quantity: number }[] {
  const since = now.getTime() - days * DAY;
  const byHandle = new Map<string, { handle: string; title: string; quantity: number }>();
  for (const o of orders) {
    if (!isSale(o) || new Date(o.createdAt).getTime() < since) continue;
    for (const l of o.lines) {
      const e = byHandle.get(l.handle) ?? { handle: l.handle, title: l.title, quantity: 0 };
      e.quantity += l.quantity;
      byHandle.set(l.handle, e);
    }
  }
  return [...byHandle.values()].sort((a, b) => b.quantity - a.quantity || a.title.localeCompare(b.title, "fr")).slice(0, n);
}

/** Clientes arrivées sur la période (première commande ou création du compte). */
export function newCustomers<T extends { createdAt: string }>(customers: T[], now: Date, days = 30): T[] {
  const since = now.getTime() - days * DAY;
  return customers.filter((c) => new Date(c.createdAt).getTime() >= since);
}

/** « 1 message », « 3 messages ». */
export const compte = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export interface Priorite {
  href: string;
  titre: string;
  detail: string;
}

export interface EtatDuJour {
  /** commandes en retard sur le délai annoncé */
  late: number;
  rdvToday: number;
  /** messages à lire (nouveaux, brouillon prêt, confiés à la créatrice) */
  messages: number;
  received: number;
  ready: number;
  returns: number;
  proposals: number;
  reviews: number;
  /** pièces sans aucune taille vendable */
  unsellable: string[];
  /** pièces dont le prix ou le délai est encore provisoire */
  provisional: string[];
  /** collections en cours sans texte de présentation */
  collectionsSansTexte: string[];
}

/**
 * Ce qui attend la créatrice, dans l'ordre où le faire : ce qui fait attendre une cliente d'abord
 * (retards, rendez-vous du jour, messages, commandes), puis la boutique (retours, propositions,
 * avis), enfin ce qui manque au catalogue. Rien n'est inventé : chaque ligne vient d'un compte réel.
 */
export function priorites(e: EtatDuJour): Priorite[] {
  const out: Priorite[] = [];
  if (e.late) out.push({ href: "/commandes", titre: `${compte(e.late, "commande", "commandes")} en retard sur le délai annoncé`, detail: "À faire avancer en priorité, ou à expliquer à la cliente." });
  if (e.rdvToday) out.push({ href: "/rendez-vous", titre: `${compte(e.rdvToday, "rendez-vous", "rendez-vous")} aujourd’hui`, detail: "Le lien de l’appel vidéo est dans Rendez-vous." });
  if (e.messages) out.push({ href: "/messages", titre: e.messages > 1 ? `${e.messages} clientes attendent une réponse` : "Une cliente attend une réponse", detail: "Une réponse est souvent déjà préparée : relisez-la, puis envoyez." });
  if (e.received) out.push({ href: "/commandes", titre: e.received > 1 ? `${e.received} commandes attendent d’être mises en confection` : "Une commande attend d’être mise en confection", detail: "Un geste la fait avancer, et la cliente reçoit l’e-mail de l’étape." });
  if (e.ready) out.push({ href: "/commandes", titre: e.ready > 1 ? `${e.ready} pièces prêtes à expédier` : "Une pièce prête à expédier", detail: "Ajoutez le numéro de suivi au moment de l’envoi." });
  if (e.returns) out.push({ href: "/retours", titre: `${compte(e.returns, "retour", "retours")} à traiter`, detail: "Demandes de retour et colis arrivés à l’atelier." });
  if (e.proposals) out.push({ href: "/validations", titre: `${compte(e.proposals, "proposition", "propositions")} à valider`, detail: "Rien ne part sans votre accord : prix, remboursements, lettres." });
  if (e.reviews) out.push({ href: "/avis", titre: `${compte(e.reviews, "avis", "avis")} à relire`, detail: "Un avis n’est publié qu’après votre lecture." });
  if (e.unsellable.length) out.push({ href: "/catalogue", titre: e.unsellable.length > 1 ? `${e.unsellable.length} pièces ne peuvent pas être achetées` : `« ${e.unsellable[0]} » ne peut pas être achetée`, detail: "Aucune taille n’est ouverte à la vente." });
  if (e.collectionsSansTexte.length) out.push({ href: "/pages", titre: e.collectionsSansTexte.length > 1 ? "Vos collections n’ont pas encore de présentation" : `Votre collection « ${e.collectionsSansTexte[0]} » n’a pas encore de présentation`, detail: "Quelques lignes suffisent, dans la page de la collection." });
  if (e.provisional.length) out.push({ href: "/catalogue", titre: e.provisional.length > 1 ? `${e.provisional.length} pièces ont un prix ou un délai à confirmer` : `Le prix ou le délai de « ${e.provisional[0]} » est à confirmer`, detail: "Une fois confirmé, la mention provisoire disparaît du site." });
  return out;
}

export interface Evenement {
  date: string;
  texte: string;
  /** « atelier:/messages » pour une page de l'Atelier (convention du journal), « /boutique/… » pour le site */
  href?: string;
}

/**
 * Activité récente : messages reçus et gestes faits par les agents, les plus récents d'abord. Les
 * commandes ont leur propre liste (Dernières commandes), les gestes techniques (connexions, double
 * authentification) restent dans le journal.
 */
export function activiteRecente(sources: { messages: { date: string; name: string }[]; actions: { date: string; summary: string; status: string; agent?: string; target?: { href?: string } }[] }, n = 5): Evenement[] {
  const all: Evenement[] = [
    ...sources.messages.map((m) => ({ date: m.date, texte: `Message de ${prenom(m.name)}`, href: "atelier:/messages" })),
    ...sources.actions.filter((a) => (a.status === "done" || a.status === "approved") && a.agent !== "systeme").map((a) => ({ date: a.date, texte: a.summary, href: a.target?.href })),
  ];
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

/** « Camille Martin » → « Camille M. » : la Vue d'ensemble n'affiche pas les noms en entier. */
export function prenom(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first || "Une cliente";
}
