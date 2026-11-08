/**
 * Commandes de l'Atelier (lot 3 de la refonte) : recherche, étapes et périodes, en règles pures,
 * partagées par la page Commandes et les tests unitaires. Les jours se comptent à l'heure de Paris.
 * Rien n'est inventé : une liste vide se dit telle quelle.
 */
import type { OrderStatus } from "@/lib/commerce/types";

export type FiltreEtape = "toutes" | "a-traiter" | "en-confection" | "prete" | "expediee" | "livree" | "en-attente" | "retours";

/** Les étapes telles que la créatrice les lit, dans l'ordre de la confection. */
export const ETAPES_FILTRE: readonly { id: FiltreEtape; label: string; statuts: readonly OrderStatus[] }[] = [
  { id: "toutes", label: "Toutes", statuts: [] },
  { id: "a-traiter", label: "À commencer", statuts: ["paid"] },
  { id: "en-confection", label: "En confection", statuts: ["in_production"] },
  { id: "prete", label: "Prêtes", statuts: ["ready"] },
  { id: "expediee", label: "Expédiées", statuts: ["shipped"] },
  { id: "livree", label: "Livrées", statuts: ["delivered"] },
  { id: "en-attente", label: "En attente", statuts: ["pending", "blocked"] },
  { id: "retours", label: "Retours et remboursements", statuts: ["returned", "refunded"] },
];

export type Periode = "tout" | "jour" | "7j" | "30j" | "12m";

export const PERIODES: readonly { id: Periode; label: string }[] = [
  { id: "tout", label: "Depuis le début" },
  { id: "jour", label: "Aujourd’hui" },
  { id: "7j", label: "7 derniers jours" },
  { id: "30j", label: "30 derniers jours" },
  { id: "12m", label: "12 derniers mois" },
];

export const estEtape = (v: unknown): v is FiltreEtape => ETAPES_FILTRE.some((e) => e.id === v);
export const estPeriode = (v: unknown): v is Periode => PERIODES.some((p) => p.id === v);

/** Jour de Paris d'une date : « 2026-11-08 ». */
export function jourDeParis(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** La commande tombe-t-elle dans la période, comptée à partir de maintenant ? */
export function dansPeriode(createdAt: string, periode: Periode, maintenant: Date): boolean {
  if (periode === "tout") return true;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  if (periode === "jour") return jourDeParis(d) === jourDeParis(maintenant);
  const jours = periode === "7j" ? 7 : periode === "30j" ? 30 : 365;
  return maintenant.getTime() - d.getTime() <= jours * 86_400_000 && d.getTime() <= maintenant.getTime() + 60_000;
}

/** Texte comparé sans accents ni majuscules : « Hélène » se trouve en tapant « helene ». */
export const sansAccents = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface CommandeCherchable {
  number: string;
  name: string;
  email: string;
  status: OrderStatus;
  createdAt: string;
  lines: { title: string }[];
}

/** Une commande répond-elle à la recherche (numéro, nom, adresse e-mail ou pièce) ? */
export function correspond<O extends CommandeCherchable>(o: O, recherche: string): boolean {
  const q = sansAccents(recherche).replace(/^#/, "");
  if (!q) return true;
  const champs = [o.number, o.name, o.email, ...o.lines.map((l) => l.title)].map(sansAccents);
  return q.split(/\s+/).every((mot) => champs.some((c) => c.includes(mot)));
}

export function filtrerCommandes<O extends CommandeCherchable>(orders: readonly O[], f: { q?: string; etape?: FiltreEtape; periode?: Periode }, maintenant: Date): O[] {
  const statuts = ETAPES_FILTRE.find((e) => e.id === (f.etape ?? "toutes"))?.statuts ?? [];
  return orders.filter((o) => (statuts.length ? statuts.includes(o.status) : true) && dansPeriode(o.createdAt, f.periode ?? "tout", maintenant) && correspond(o, f.q ?? ""));
}

/** Nombre de commandes par étape, pour les filtres (la recherche et la période déjà appliquées). */
export function compterParEtape<O extends { status: OrderStatus }>(orders: readonly O[]): Record<FiltreEtape, number> {
  return Object.fromEntries(ETAPES_FILTRE.map((e) => [e.id, e.statuts.length ? orders.filter((o) => e.statuts.includes(o.status)).length : orders.length])) as Record<FiltreEtape, number>;
}

export interface NoteInterne {
  texte: string;
  par: string;
  at: string;
}

export interface EvenementHistorique {
  at: string;
  quoi: string;
  /** qui : « La cliente », « L’atelier », un agent… */
  par?: string;
}

/** Historique d'une commande, du plus récent au plus ancien, sans doublon à la même minute. */
export function historique(evenements: readonly EvenementHistorique[]): EvenementHistorique[] {
  const vus = new Set<string>();
  return [...evenements]
    .filter((e) => !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .filter((e) => {
      const cle = `${e.at.slice(0, 16)}|${e.quoi}`;
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
}
