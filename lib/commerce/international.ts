/**
 * Livraison et taxes selon le pays (calcul partagé par la page de commande et le serveur).
 * - France et Union européenne : prix affichés toutes taxes comprises (TVA française incluse).
 * - Hors Union européenne : la pièce part hors TVA française ; droits de douane et TVA du pays
 *   d'arrivée calculés et payés à la commande (rendu droits acquittés : rien à régler au livreur).
 * En production, Shopify fait ce calcul lui-même (Marchés, droits et taxes à l'importation).
 */
import { shop } from "@/content/settings";
import { legalFields } from "@/content/legal/fields";
import type { OrderTaxes } from "./types";

/** Franchise en base de TVA (mention « art. 293 B du CGI » dans le registre légal) : aucune TVA facturée. */
export const vatFranchise = () => /293\s*B/i.test(legalFields.tva.value);

export type Zone = "FR" | "EU" | "WORLD";
export type ShippingRate = (typeof shop.shippingRates)[number];

export const zoneOf = (country: string): Zone | null => (shop.countries.find((c) => c.code === country)?.zone as Zone | undefined) ?? null;

/** Modes de livraison proposés pour un pays. */
export function ratesFor(country: string): ShippingRate[] {
  const zone = zoneOf(country);
  return shop.shippingRates.filter((r) => r.zone === zone && (!r.countries || r.countries.includes(country)));
}

/** Prix de la livraison, offerte au-delà du seuil quand le mode le permet. */
export function shippingPrice(rate: ShippingRate, merchandise: number): number {
  return rate.freeAboveThreshold && merchandise >= shop.freeShippingThreshold ? 0 : rate.price;
}

const round = (n: number) => Math.round(n);

/**
 * Taxes de la commande. `goods` : montant des pièces (et de l'emballage) TTC, remises déduites ;
 * `shipping` : livraison TTC. Renvoie aussi le total à payer.
 */
export function orderTaxes(country: string, goods: number, shipping: number): { taxes: OrderTaxes; total: number } {
  const zone = zoneOf(country);
  const rates = zone === "WORLD" ? shop.importRates[country] : undefined;
  const fr = vatFranchise() ? 0 : shop.vatRate;
  if (!rates) {
    const total = goods + shipping;
    return { taxes: { vatRate: fr, vat: fr ? round(total - total / (1 + fr)) : 0 }, total };
  }
  const exVat = round(goods / (1 + fr));
  const shippingExVat = round(shipping / (1 + fr));
  // droits sur la valeur des pièces et du transport ; TVA du pays sur l'ensemble, droits compris
  const duty = round((exVat + shippingExVat) * rates.duty);
  const importVat = round((exVat + shippingExVat + duty) * rates.vat);
  return {
    taxes: { vatRate: 0, vat: 0, export: { exVat: exVat + shippingExVat, duty, dutyRate: rates.duty, importVat, importVatRate: rates.vat } },
    total: exVat + shippingExVat + duty + importVat,
  };
}

/** Première date de livraison possible pour un cadeau (AAAA-MM-JJ), selon les pièces sur commande. */
export function earliestGiftDate(leadTimeWeeks = 0, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + shop.giftDateMinDays + leadTimeWeeks * 7);
  return d.toISOString().slice(0, 10);
}

/** Dernière date acceptée (six mois). */
export function latestGiftDate(from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}
