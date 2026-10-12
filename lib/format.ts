import { identity } from "@/content/brand/identity";

const euro = new Intl.NumberFormat(identity.locale, {
  style: "currency",
  currency: identity.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Montant en centimes → « 690 € » */
export function formatPrice(cents: number): string {
  return euro.format(cents / 100).replace(/ /g, " ");
}

const dateLong = new Intl.DateTimeFormat(identity.locale, { day: "numeric", month: "long", year: "numeric" });
const dateMonth = new Intl.DateTimeFormat(identity.locale, { month: "long", year: "numeric" });

export function formatDate(iso: string): string {
  return dateLong.format(new Date(iso));
}

export function formatMonth(iso: string): string {
  return dateMonth.format(new Date(iso.length === 7 ? `${iso}-01` : iso));
}

/** Chiffres romains pour les numéros d'étapes et d'édition éventuels */
export function roman(n: number): string {
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
