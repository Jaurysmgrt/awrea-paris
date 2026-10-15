/**
 * Ce que la mise en page « édition » lit dans le catalogue : numéro d'édition, matières, temps de
 * façon, tirage du numéro, temps de lecture. Rien n'est inventé : tout vient des fiches des pièces.
 */
import type { Product } from "@/lib/commerce/types";
import { editionInfo } from "@/lib/commerce/availability";
import { formatPrice } from "@/lib/format";
import { portfolio } from "./textes";

const nb = " ";

/** Numéro d'édition présenté comme un folio : « N° 3 / 5 », « 5 / 5 », ou pièce unique. */
export function chiffre(p: Pick<Product, "edition">) {
  const ed = editionInfo(p);
  return { n: ed.complete ? ed.total : ed.nextNumber, total: ed.total, unique: ed.unique, complete: ed.complete, reste: ed.remaining, label: ed.label };
}

/** « 92 % viscose et 8 % élasthanne » */
export function matieres(p: Pick<Product, "materials">): string {
  const parts = p.materials.map((m) => `${m.percent}${nb}% ${m.name.toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** La légende de mode, comme dans un magazine : la pièce, sa matière, la Maison, son prix. */
export function legendeDeMode(p: Product): string {
  return `${p.title}, ${matieres(p)}. ${portfolio.maison}, ${formatPrice(p.price)}.`;
}

/** Heures de travail à la main d'après la fiche de traçabilité (valeurs provisoires du catalogue). */
export function heuresDeFacon(p: Pick<Product, "trace">): number {
  return (p.trace?.steps ?? []).reduce((s, step) => s + (step.hours ?? 0), 0);
}

/** Tirage d'un numéro : toutes les pièces numérotées de la collection, et celles qui restent. */
export function tirage(pieces: Product[]) {
  return pieces.reduce((t, p) => ({ total: t.total + p.edition.total, reste: t.reste + editionInfo(p).remaining }), { total: 0, reste: 0 });
}

/** Temps de lecture d'un ensemble de textes, à 200 mots par minute. */
export function minutesDeLecture(textes: string[]): number {
  const mots = textes.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(mots / 200));
}
