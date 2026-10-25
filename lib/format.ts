import { identity } from "@/content/brand/identity";
import { DEFAULT_LOCALE, INTL_LOCALE, type Locale } from "@/lib/i18n/routing";

/**
 * Formats de la Maison dans chaque langue : le français par défaut (« 70,00 € », « 6 septembre
 * 2026 »), l'anglais britannique sous /en (« €70.00 », « 6 September 2026 »). La devise reste
 * toujours l'euro.
 */
const intlOf = (locale: Locale) => (locale === DEFAULT_LOCALE ? identity.locale : INTL_LOCALE[locale]);
const memo = <T>(make: (locale: Locale) => T) => {
  const made = new Map<Locale, T>();
  return (locale: Locale): T => {
    let f = made.get(locale);
    if (!f) made.set(locale, (f = make(locale)));
    return f;
  };
};

const euroCents = memo((l) => new Intl.NumberFormat(intlOf(l), { style: "currency", currency: identity.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/**
 * Montant en centimes → « 70,00 € » (« €70.00 » en anglais), toujours avec ses centimes (format des
 * maquettes de la Maison). Les espaces fines insécables d'Intl (absentes de nos polices) deviennent
 * des espaces insécables.
 */
export function formatPrice(cents: number, locale: Locale = DEFAULT_LOCALE): string {
  return euroCents(locale).format(cents / 100).replace(/[\u202f ]/g, "\u00a0");
}

const dateLong = memo((l) => new Intl.DateTimeFormat(intlOf(l), { day: "numeric", month: "long", year: "numeric" }));
const dateMonth = memo((l) => new Intl.DateTimeFormat(intlOf(l), { month: "long", year: "numeric" }));

export function formatDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return dateLong(locale).format(new Date(iso));
}

export function formatMonth(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return dateMonth(locale).format(new Date(iso.length === 7 ? `${iso}-01` : iso));
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
