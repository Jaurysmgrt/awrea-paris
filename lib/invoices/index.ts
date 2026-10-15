/**
 * Factures et avoirs.
 *
 * - Numérotation continue, chronologique et sans trou, par année : F-2026-0001 (factures),
 *   A-2026-0001 (avoirs) ; un verrou court garantit qu'un numéro n'est jamais donné deux fois.
 * - Une facture par commande, émise une seule fois (le webhook Shopify peut arriver deux fois),
 *   jamais modifiée ensuite : un remboursement donne lieu à un avoir.
 * - Mentions obligatoires lues dans le registre légal (content/legal/fields.ts) : tant qu'un champ
 *   manque, la facture affiche un repère « [À COMPLÉTER : …] » bien visible.
 * - Régime de TVA : TVA française incluse (20 %), exportation hors Union européenne exonérée,
 *   ou franchise en base (mention « art. 293 B du CGI » dans le registre légal).
 *
 * Conservation : dix ans (obligation comptable), dans le stockage technique.
 */
import "server-only";
import { kv } from "@/lib/store";
import { shop } from "@/content/settings";
import { vatFranchise } from "@/lib/commerce/international";
import type { Address, Order } from "@/lib/commerce/types";

export interface InvoiceLine {
  title: string;
  detail?: string;
  quantity: number;
  /** prix unitaire toutes taxes comprises, en centimes */
  unitTtc: number;
}

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
  regime: "tva" | "export" | "franchise";
  totals: { ht: number; vat: number; ttc: number; duty?: number; importVat?: number };
  paymentMethod: string;
  /** part réglée par carte cadeau */
  giftCard?: number;
  reason?: string;
}

const LIST = "invoices";
const COUNTERS = "invoices:counters";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Numéro suivant de l'année, sous verrou (une seule émission à la fois). */
async function nextNumber(kind: Invoice["kind"], year: number): Promise<string> {
  const lock = "invoices:lock";
  for (let i = 0; (await kv.incr(lock, 10)) > 1; i++) {
    if (i > 50) throw new Error("factures : verrou occupé");
    await sleep(100);
  }
  try {
    const counters = (await kv.get<Record<string, number>>(COUNTERS)) ?? {};
    const key = `${kind}:${year}`;
    const next = (counters[key] ?? 0) + 1;
    await kv.set(COUNTERS, { ...counters, [key]: next });
    return `${kind === "facture" ? "F" : "A"}-${year}-${String(next).padStart(4, "0")}`;
  } finally {
    await kv.del(lock);
  }
}

const round = (n: number) => Math.round(n);

/** Montants hors taxes et TVA à partir des lignes TTC (la TVA est la différence : le TTC reste exact). */
function totalsOf(lines: InvoiceLine[], rate: number): Invoice["totals"] {
  const ttc = lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0);
  const ht = rate ? round(ttc / (1 + rate)) : ttc;
  return { ht, vat: ttc - ht, ttc };
}

/** La facture (ou le dernier avoir) d'une commande. */
export async function invoiceOf(orderNumber: string, kind: Invoice["kind"] = "facture"): Promise<Invoice | null> {
  return (await listInvoices()).filter((i) => i.orderNumber === orderNumber && i.kind === kind).at(-1) ?? null;
}

export async function listInvoices(month?: string): Promise<Invoice[]> {
  const all = (await kv.get<Invoice[]>(LIST)) ?? [];
  return month ? all.filter((i) => i.issuedAt.startsWith(month)) : all;
}

async function store(invoice: Invoice) {
  const all = (await kv.get<Invoice[]>(LIST)) ?? [];
  await kv.set(LIST, [...all, invoice]);
}

/** Lignes de la facture d'une commande : pièces, emballage, livraison (prix TTC payés). */
function linesOf(order: Order, giftWrapPrice = shop.giftWrapPrice): InvoiceLine[] {
  const lines: InvoiceLine[] = order.lines.map((l) => ({
    title: l.title,
    detail: [l.size === "TU" ? "Taille unique" : `Taille ${l.size}`, l.editionLabel].filter(Boolean).join(" · "),
    quantity: l.quantity,
    unitTtc: l.unitPrice,
  }));
  if (order.discount?.amount) lines.push({ title: `Remise ${order.discount.code}`, detail: order.discount.label, quantity: 1, unitTtc: -order.discount.amount });
  if (order.gift?.wrap) lines.push({ title: "Emballage cadeau", detail: "Mot écrit à la main", quantity: 1, unitTtc: giftWrapPrice });
  if (order.shipping.price) lines.push({ title: "Livraison", detail: order.shipping.method, quantity: 1, unitTtc: order.shipping.price });
  return lines;
}

/** Émet la facture d'une commande payée (une seule fois). */
export async function issueInvoice(order: Order): Promise<Invoice> {
  const existing = await invoiceOf(order.number);
  if (existing) return existing;
  const lock = `invoices:order:${order.number}`;
  if ((await kv.incr(lock, 30)) > 1) {
    await sleep(400);
    const again = await invoiceOf(order.number);
    if (again) return again;
  }
  try {
    const exp = order.taxes?.export;
    const franchise = vatFranchise();
    const regime: Invoice["regime"] = franchise ? "franchise" : exp ? "export" : "tva";
    const rate = regime === "tva" ? (order.taxes?.vatRate ?? shop.vatRate) : 0;
    // exportation : pièces et livraison facturées hors TVA française, au centime près de ce qui a été payé
    const fr = franchise ? 0 : shop.vatRate;
    const lines = linesOf(order).map((l) => (regime === "export" ? { ...l, unitTtc: round(l.unitTtc / (1 + fr)) } : l));
    if (exp && lines.length) {
      const diff = exp.exVat - lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0);
      const last = lines.findLast((l) => l.quantity === 1);
      if (last) last.unitTtc += diff;
    }
    const totals = totalsOf(lines, rate);
    if (exp) Object.assign(totals, { duty: exp.duty, importVat: exp.importVat, ttc: totals.ttc + exp.duty + exp.importVat });
    const now = new Date();
    const invoice: Invoice = {
      number: await nextNumber("facture", now.getFullYear()),
      kind: "facture",
      orderNumber: order.number,
      issuedAt: now.toISOString(),
      saleDate: order.createdAt,
      buyer: { name: order.address ? `${order.address.firstName} ${order.address.lastName}` : order.name, email: order.email, address: order.address },
      lines,
      vatRate: rate,
      regime,
      totals,
      paymentMethod: order.paymentMethod,
      ...(order.giftCard?.amount ? { giftCard: order.giftCard.amount } : {}),
    };
    await store(invoice);
    return invoice;
  } finally {
    await kv.del(lock);
  }
}

/**
 * Avoir (remboursement total ou partiel) : appelé une fois le remboursement validé par la
 * créatrice. Les lignes reprennent les pièces remboursées, en montants positifs.
 */
export async function issueCreditNote(order: Order, lines: InvoiceLine[], reason: string): Promise<Invoice> {
  const invoice = await issueInvoice(order);
  const regimeRate = invoice.vatRate;
  const now = new Date();
  const note: Invoice = {
    number: await nextNumber("avoir", now.getFullYear()),
    kind: "avoir",
    orderNumber: order.number,
    refOf: invoice.number,
    issuedAt: now.toISOString(),
    saleDate: order.createdAt,
    buyer: invoice.buyer,
    lines: invoice.regime === "export" ? lines.map((l) => ({ ...l, unitTtc: round(l.unitTtc / (1 + shop.vatRate)) })) : lines,
    vatRate: regimeRate,
    regime: invoice.regime,
    totals: totalsOf(lines, regimeRate),
    paymentMethod: invoice.paymentMethod,
    reason,
  };
  await store(note);
  return note;
}

/** Export comptable d'un mois (AAAA-MM) : une ligne par facture ou avoir, séparateur « ; » (tableurs français). */
export async function accountingCsv(month: string): Promise<string> {
  const rows = (await listInvoices(month)).sort((a, b) => a.number.localeCompare(b.number));
  const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const sign = (i: Invoice) => (i.kind === "avoir" ? -1 : 1);
  const head = ["Date", "Pièce", "Numéro", "Facture d’origine", "Commande", "Cliente", "Pays", "Régime", "Taux TVA", "Total HT", "TVA", "Total TTC", "Droits et taxes à l’importation", "Paiement"];
  const lines = rows.map((i) =>
    [
      i.issuedAt.slice(0, 10),
      i.kind === "facture" ? "Facture" : "Avoir",
      i.number,
      i.refOf ?? "",
      i.orderNumber,
      i.buyer.name,
      i.buyer.address?.country ?? "",
      { tva: "TVA française", export: "Exportation (exonérée)", franchise: "Franchise en base" }[i.regime],
      `${Math.round(i.vatRate * 1000) / 10} %`,
      euros(sign(i) * i.totals.ht),
      euros(sign(i) * i.totals.vat),
      euros(sign(i) * (i.totals.ttc - (i.totals.duty ?? 0) - (i.totals.importVat ?? 0))),
      euros(sign(i) * ((i.totals.duty ?? 0) + (i.totals.importVat ?? 0))),
      i.paymentMethod,
    ]
      .map((v) => esc(String(v)))
      .join(";"),
  );
  // marque d'ordre des octets : accents lus correctement par Excel
  return "﻿" + [head.join(";"), ...lines].join("\r\n") + "\r\n";
}
