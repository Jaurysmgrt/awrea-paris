/**
 * Factures et avoirs.
 *
 * - Numérotation continue, chronologique et sans trou, par année : F-2026-0001 (factures),
 *   A-2026-0001 (avoirs) ; un verrou court garantit qu'un numéro n'est jamais donné deux fois.
 * - Une facture par commande, émise une seule fois (une demande peut arriver deux fois),
 *   jamais modifiée ensuite : un remboursement donne lieu à un avoir.
 * - Mentions obligatoires lues dans le registre légal (content/legal/fields.ts) : tant qu'un champ
 *   manque, la facture affiche un repère « [À COMPLÉTER : …] » bien visible.
 * - Régime de TVA lu dans le réglage unique de la Maison (content/settings.ts → shop.vatRegime) :
 *   franchise en base (aucune TVA, mention de l'article 293 B du CGI), TVA française incluse
 *   (20 %), ou exportation hors Union européenne exonérée. Calculs : lib/invoices/calcul.ts.
 *
 * - Désignation au modèle de la Maison : chaque pièce est créée sur demande par des artisans
 *   français, sans stock ; la ligne porte la taille et « création sur demande » (plus aucun numéro
 *   d'édition ni de série : le numéro de création est inscrit sur le certificat d'authenticité).
 *
 * Conservation : dix ans (obligation comptable), dans le stockage technique.
 */
import "server-only";
import { kv } from "@/lib/store";
import type { Order } from "@/lib/commerce/types";
import { composeCreditNote, composeInvoice, type Invoice, type InvoiceLine } from "./calcul";

export type { Invoice, InvoiceLine } from "./calcul";

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
    // lignes, régime de TVA (franchise en base, TVA française ou exportation) et totaux
    const { lines, vatRate, regime, totals } = composeInvoice(order);
    const now = new Date();
    const invoice: Invoice = {
      number: await nextNumber("facture", now.getFullYear()),
      kind: "facture",
      orderNumber: order.number,
      issuedAt: now.toISOString(),
      saleDate: order.createdAt,
      buyer: { name: order.address ? `${order.address.firstName} ${order.address.lastName}` : order.name, email: order.email, address: order.address },
      lines,
      vatRate,
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
  const now = new Date();
  const note: Invoice = {
    number: await nextNumber("avoir", now.getFullYear()),
    kind: "avoir",
    orderNumber: order.number,
    refOf: invoice.number,
    issuedAt: now.toISOString(),
    saleDate: order.createdAt,
    buyer: invoice.buyer,
    ...composeCreditNote(invoice, lines),
    vatRate: invoice.vatRate,
    regime: invoice.regime,
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
  const head = ["Date", "Document", "Numéro", "Facture d’origine", "Commande", "Cliente", "Pays", "Régime", "Taux TVA", "Total HT", "TVA", "Total TTC", "Droits et taxes à l’importation", "Paiement"];
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
