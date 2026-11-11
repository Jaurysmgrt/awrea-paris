/**
 * Contenu d'une facture ou d'un avoir : lignes, régime de TVA, totaux, puis ce que le PDF imprime
 * (colonnes, lignes de totaux, mentions du bas). Module pur, sans stockage ni serveur : partagé par
 * l'émission (lib/invoices/index.ts), le PDF (lib/invoices/pdf.ts) et les tests.
 *
 * Régime lu dans le réglage unique de la Maison (content/settings.ts → shop.vatRegime) :
 * - franchise en base : aucune TVA, ni colonne ni ligne de TVA, total sans TVA, et la mention
 *   « TVA non applicable, article 293 B du Code général des impôts. » en bas de la facture ;
 * - TVA française (« tva20 ») : prix unitaires hors taxes, taux, ligne de TVA et total TTC ;
 * - exportation hors Union européenne (régime « tva20 » seulement) : pièces et livraison hors TVA
 *   française, exonération de l'article 262 I du CGI. En franchise, une exportation reste en
 *   franchise : rien n'est retiré du prix, puisqu'il ne contient aucune TVA.
 */
import { shop } from "@/content/settings";
import { MENTION_FRANCHISE, vatFranchise } from "@/lib/commerce/tva";
import type { Address, Order } from "@/lib/commerce/types";

export interface InvoiceLine {
  title: string;
  detail?: string;
  quantity: number;
  /** prix unitaire payé (toutes taxes comprises au régime « tva20 », sans TVA en franchise), en centimes */
  unitTtc: number;
}

export type InvoiceRegime = "tva" | "export" | "franchise";

export interface Invoice {
  number: string;
  kind: "facture" | "avoir";
  orderNumber: string;
  /** avoir : facture d'origine */
  refOf?: string;
  issuedAt: string;
  saleDate: string;
  buyer: { name: string; email: string; address?: Address };
  lines: InvoiceLine[];
  /** taux appliqué (0 : exportation ou franchise) */
  vatRate: number;
  regime: InvoiceRegime;
  totals: { ht: number; vat: number; ttc: number; duty?: number; importVat?: number };
  paymentMethod: string;
  /** part réglée par carte cadeau */
  giftCard?: number;
  reason?: string;
}

const round = (n: number) => Math.round(n);

/** Montants hors taxes et TVA à partir des lignes payées (la TVA est la différence : le total payé reste exact). */
export function totalsOf(lines: InvoiceLine[], rate: number): Invoice["totals"] {
  const ttc = lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0);
  const ht = rate ? round(ttc / (1 + rate)) : ttc;
  return { ht, vat: ttc - ht, ttc };
}

/** Lignes de la facture d'une commande : pièces, remise, emballage, livraison (prix payés). */
export function linesOf(order: Order, giftWrapPrice: number = shop.giftWrapPrice): InvoiceLine[] {
  const lines: InvoiceLine[] = order.lines.map((l) => ({
    title: l.title,
    detail: `${l.size === "TU" ? "Taille unique" : `Taille ${l.size}`} · création sur demande`,
    quantity: l.quantity,
    unitTtc: l.unitPrice,
  }));
  if (order.discount?.amount) lines.push({ title: `Remise ${order.discount.code}`, detail: order.discount.label, quantity: 1, unitTtc: -order.discount.amount });
  if (order.gift?.wrap) lines.push({ title: "Emballage cadeau", detail: "Mot écrit à la main", quantity: 1, unitTtc: giftWrapPrice });
  if (order.shipping.price) lines.push({ title: "Livraison", detail: order.shipping.method, quantity: 1, unitTtc: order.shipping.price });
  return lines;
}

/** Régime de la facture d'une commande : la franchise prime, puis l'exportation, puis la TVA française. */
export function regimeOf(order: Pick<Order, "taxes">, franchise = vatFranchise()): InvoiceRegime {
  return franchise ? "franchise" : order.taxes?.export ? "export" : "tva";
}

/**
 * Corps de la facture d'une commande : lignes, régime, taux et totaux. En franchise, les lignes
 * gardent les prix payés et le total ne porte aucune TVA.
 */
export function composeInvoice(order: Order, opts: { franchise?: boolean; giftWrapPrice?: number } = {}): Pick<Invoice, "lines" | "vatRate" | "regime" | "totals"> {
  const franchise = opts.franchise ?? vatFranchise();
  const exp = order.taxes?.export;
  const regime = regimeOf(order, franchise);
  const rate = regime === "tva" ? (order.taxes?.vatRate ?? shop.vatRate) : 0;
  // exportation : pièces et livraison facturées hors TVA française, au centime près de ce qui a été payé
  const fr = franchise ? 0 : shop.vatRate;
  const lines = linesOf(order, opts.giftWrapPrice).map((l) => (regime === "export" ? { ...l, unitTtc: round(l.unitTtc / (1 + fr)) } : l));
  if (exp && lines.length) {
    const diff = exp.exVat - lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0);
    const last = lines.findLast((l) => l.quantity === 1);
    if (last) last.unitTtc += diff;
  }
  const totals = totalsOf(lines, rate);
  if (exp) Object.assign(totals, { duty: exp.duty, importVat: exp.importVat, ttc: totals.ttc + exp.duty + exp.importVat });
  return { lines, vatRate: rate, regime, totals };
}

/** Lignes et totaux d'un avoir, au régime de la facture d'origine (montants positifs). */
export function composeCreditNote(invoice: Pick<Invoice, "regime" | "vatRate">, lines: InvoiceLine[]): Pick<Invoice, "lines" | "totals"> {
  return {
    lines: invoice.regime === "export" ? lines.map((l) => ({ ...l, unitTtc: round(l.unitTtc / (1 + shop.vatRate)) })) : lines,
    totals: totalsOf(lines, invoice.vatRate),
  };
}

// ------------------------------------------------------------------ ce que le PDF imprime
export interface InvoiceColumn {
  key: "qty" | "unit" | "vat" | "total";
  label: string;
}

export interface InvoiceRow {
  title: string;
  detail?: string;
  /** valeurs des colonnes, en centimes pour les montants */
  quantity: number;
  unit: number;
  /** taux affiché dans la colonne TVA (absent en franchise : la colonne n'existe pas) */
  vatRate?: number;
  total: number;
}

export interface InvoiceLayout {
  columns: InvoiceColumn[];
  rows: InvoiceRow[];
  /** lignes de totaux, la dernière en évidence (montants en centimes) */
  totals: { label: string; amount: number; strong?: boolean }[];
  /** mentions du bas de la facture */
  notes: string[];
}

const percent = (rate: number) => `${Math.round(rate * 1000) / 10} %`;

/**
 * Mise en page d'une facture ou d'un avoir : colonnes, lignes, totaux et mentions du bas.
 * `payment` et `saleDate` sont déjà rédigés par l'appelant (moyen de paiement, date en toutes lettres).
 */
export function invoiceLayout(inv: Invoice, words: { payment: string; saleDate: string }): InvoiceLayout {
  const franchise = inv.regime === "franchise";
  const rate = inv.vatRate;
  const columns: InvoiceColumn[] = franchise
    ? [
        { key: "qty", label: "Qté" },
        { key: "unit", label: "Prix unitaire" },
        { key: "total", label: "Total" },
      ]
    : [
        { key: "qty", label: "Qté" },
        { key: "unit", label: "PU HT" },
        { key: "vat", label: "TVA" },
        { key: "total", label: "Total HT" },
      ];
  const rows: InvoiceRow[] = inv.lines.map((l) => {
    const unit = rate ? Math.round(l.unitTtc / (1 + rate)) : l.unitTtc;
    return { title: l.title, detail: l.detail, quantity: l.quantity, unit, ...(franchise ? {} : { vatRate: rate }), total: unit * l.quantity };
  });

  const totals: InvoiceLayout["totals"] = [];
  const extra = (inv.totals.duty ?? 0) + (inv.totals.importVat ?? 0);
  if (!franchise) totals.push({ label: "Total hors taxes", amount: inv.totals.ht });
  else if (extra) totals.push({ label: "Pièces et livraison", amount: inv.totals.ht });
  if (inv.regime === "tva") totals.push({ label: `TVA ${percent(rate)}`, amount: inv.totals.vat });
  if (inv.totals.duty) totals.push({ label: "Droits de douane du pays d’arrivée", amount: inv.totals.duty });
  if (inv.totals.importVat) totals.push({ label: "Taxe à l’importation du pays d’arrivée", amount: inv.totals.importVat });
  totals.push({ label: inv.kind === "facture" ? "Total payé" : "Total remboursé", amount: inv.totals.ttc, strong: true });
  if (inv.giftCard) totals.push({ label: "dont carte cadeau", amount: inv.giftCard });

  const notes = [
    inv.kind === "facture" ? `Réglée le ${words.saleDate} par ${words.payment}.` : `Remboursement par ${words.payment}${inv.reason ? `, ${inv.reason}` : ""}.`,
    franchise ? MENTION_FRANCHISE : "",
    inv.regime === "export" ? "Exonération de TVA, article 262 I du Code général des impôts (livraison hors de l’Union européenne). Droits et taxes du pays d’arrivée réglés à la commande." : "",
    "Pièces créées sur demande par des artisans français. Facture conservée dix ans par la Maison.",
  ].filter(Boolean);
  return { columns, rows, totals, notes };
}
