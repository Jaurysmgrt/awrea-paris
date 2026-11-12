/**
 * Franchise en base de TVA (cahier du 10/11/2026) : un seul réglage du régime, aucune TVA facturée,
 * factures sans ligne de TVA et avec la mention de l'article 293 B, mention au récapitulatif et dans
 * l'e-mail de confirmation, exportation sans TVA retirée ; le régime « tva20 » reste prêt.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shop } from "@/content/settings";
import { legalFields } from "@/content/legal/fields";
import { MENTION_FRANCHISE, regimeTva, tauxTva, vatFranchise } from "@/lib/commerce/tva";
import { orderTaxes } from "@/lib/commerce/international";
import { composeCreditNote, composeInvoice, invoiceLayout, type Invoice } from "@/lib/invoices/calcul";
import { organizationSchema } from "@/lib/seo/schema";
import type { Order } from "@/lib/commerce/types";

const MENTION = "TVA non applicable, article 293 B du Code général des impôts.";
const json = (lang: string, name: string) => JSON.parse(readFileSync(new URL(`../../content/site/${lang}/${name}.json`, import.meta.url), "utf8"));
const texts = (v: unknown): string[] => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(texts) : v && typeof v === "object" ? Object.values(v).flatMap(texts) : []);

const commande = (x: Partial<Order> = {}): Order => ({
  id: "o-tva1",
  number: "AW-2001",
  createdAt: "2026-11-11T10:00:00Z",
  email: "camille@exemple.fr",
  name: "Camille Essai",
  status: "paid",
  lines: [
    { title: "Le top Kira", size: "S", quantity: 1, unitPrice: 9000, handle: "top-kira" },
    { title: "Le body Aura", size: "M", quantity: 2, unitPrice: 7000, handle: "body-aura" },
  ],
  total: 9000 + 14000 + 900,
  shipping: { method: "Colissimo", price: 900, country: "FR" },
  paymentMethod: "Carte bancaire",
  ...x,
});

const facture = (body: ReturnType<typeof composeInvoice>, x: Partial<Invoice> = {}): Invoice => ({
  number: "F-2026-0001",
  kind: "facture",
  orderNumber: "AW-2001",
  issuedAt: "2026-11-11T10:00:00Z",
  saleDate: "2026-11-11T10:00:00Z",
  buyer: { name: "Camille Essai", email: "camille@exemple.fr" },
  paymentMethod: "Carte bancaire",
  ...body,
  ...x,
});

const mots = { payment: "carte bancaire", saleDate: "11 novembre 2026" };

test("réglage unique : la Maison est en franchise en base, aucune TVA facturée", () => {
  assert.equal(shop.vatRegime, "franchise");
  assert.equal(regimeTva(), "franchise");
  assert.equal(vatFranchise(), true);
  assert.equal(tauxTva(), 0);
  assert.equal(MENTION_FRANCHISE, MENTION);
  // le numéro de TVA intracommunautaire est sans objet tant que dure la franchise
  assert.equal(legalFields.tva.sansObjet, true);
  assert.equal(legalFields.tva.value, "");
});

test("commande en France : le prix affiché est le prix payé, sans TVA, et la franchise est notée", () => {
  const { taxes, total } = orderTaxes("FR", 23000, 900);
  assert.equal(total, 23900);
  assert.deepEqual(taxes, { vatRate: 0, vat: 0, franchise: true });
});

test("exportation hors Union européenne en franchise : aucune TVA française retirée du prix", () => {
  const ajout = { code: "GB", name: "Royaume-Uni", zone: "WORLD" as const };
  (shop.countries as { code: string; name: string; zone: string }[]).push(ajout);
  try {
    const { taxes, total } = orderTaxes("GB", 23000, 900);
    // pièces et livraison au prix affiché, puis la TVA britannique (20 %) du pays d'arrivée
    assert.equal(taxes.export?.exVat, 23900);
    assert.equal(taxes.export?.importVat, 4780);
    assert.equal(taxes.franchise, true);
    assert.equal(total, 23900 + 4780);
  } finally {
    (shop.countries as unknown[]).splice(shop.countries.indexOf(ajout as never), 1);
  }
  assert.equal(shop.countries.length, 1);
});

test("facture en franchise : ni colonne ni ligne de TVA, total sans TVA, mention de l’article 293 B en bas", () => {
  const body = composeInvoice(commande());
  assert.equal(body.regime, "franchise");
  assert.equal(body.vatRate, 0);
  assert.deepEqual(body.totals, { ht: 23900, vat: 0, ttc: 23900 });
  // prix payés repris tels quels
  assert.deepEqual(
    body.lines.map((l) => [l.title, l.quantity, l.unitTtc]),
    [
      ["Le top Kira", 1, 9000],
      ["Le body Aura", 2, 7000],
      ["Livraison", 1, 900],
    ],
  );
  const layout = invoiceLayout(facture(body), mots);
  assert.deepEqual(
    layout.columns.map((c) => c.label),
    ["Qté", "Prix unitaire", "Total"],
  );
  assert.ok(layout.rows.every((r) => r.vatRate === undefined));
  assert.deepEqual(layout.totals, [{ label: "Total payé", amount: 23900, strong: true }]);
  assert.ok(layout.totals.every((t) => !/TVA|hors taxes/i.test(t.label)));
  assert.ok(layout.notes.includes(MENTION));
  assert.ok(layout.notes.indexOf(MENTION) > 0, "après la ligne de paiement");
  assert.ok(!layout.notes.some((n) => /262 I/.test(n)));
});

test("avoir en franchise : même régime, montants remboursés sans TVA", () => {
  const body = composeInvoice(commande());
  const note = composeCreditNote(body, [{ title: "Le top Kira", quantity: 1, unitTtc: 9000 }]);
  assert.deepEqual(note.totals, { ht: 9000, vat: 0, ttc: 9000 });
  const layout = invoiceLayout(facture(body, { kind: "avoir", ...note, reason: "retour" }), mots);
  assert.equal(layout.totals.at(-1)?.label, "Total remboursé");
  assert.ok(layout.notes.includes(MENTION));
});

test("franchise et exportation : la facture reste en franchise, les droits du pays d’arrivée à part", () => {
  const exp = { exVat: 23900, duty: 0, dutyRate: 0, importVat: 4780, importVatRate: 0.2 };
  const body = composeInvoice(commande({ taxes: { vatRate: 0, vat: 0, franchise: true, export: exp } }));
  assert.equal(body.regime, "franchise");
  assert.equal(body.lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0), 23900);
  assert.equal(body.totals.ttc, 23900 + 4780);
  const layout = invoiceLayout(facture(body), mots);
  assert.deepEqual(
    layout.totals.map((t) => t.label),
    ["Pièces et livraison", "Taxe à l’importation du pays d’arrivée", "Total payé"],
  );
  assert.ok(layout.notes.includes(MENTION));
});

test("régime « tva20 » toujours prêt : prix hors taxes, colonne et ligne de TVA, sans mention 293 B", () => {
  const body = composeInvoice(commande({ taxes: { vatRate: 0.2, vat: 3983 } }), { franchise: false });
  assert.equal(body.regime, "tva");
  assert.equal(body.vatRate, 0.2);
  assert.deepEqual(body.totals, { ht: 19917, vat: 3983, ttc: 23900 });
  const layout = invoiceLayout(facture(body), mots);
  assert.deepEqual(
    layout.columns.map((c) => c.label),
    ["Qté", "PU HT", "TVA", "Total HT"],
  );
  assert.deepEqual(
    layout.totals.map((t) => t.label),
    ["Total hors taxes", "TVA 20 %", "Total payé"],
  );
  assert.ok(!layout.notes.includes(MENTION));
  // exportation au régime « tva20 » : la TVA française est retirée, exonération de l'article 262 I
  const exp = { exVat: 19917, duty: 0, dutyRate: 0, importVat: 3983, importVatRate: 0.2 };
  const export20 = composeInvoice(commande({ taxes: { vatRate: 0, vat: 0, export: exp } }), { franchise: false });
  assert.equal(export20.regime, "export");
  assert.equal(export20.lines.reduce((s, l) => s + l.unitTtc * l.quantity, 0), 19917);
  assert.ok(invoiceLayout(facture(export20), mots).notes.some((n) => /262 I/.test(n)));
});

test("récapitulatif et e-mail de confirmation : la même mention, tirée des documents de contenu", () => {
  assert.equal(json("fr", "commerce").commande.mentionTva, MENTION);
  assert.match(json("en", "commerce").commande.mentionTva, /293 B/);
  for (const lang of ["fr", "en"]) {
    const mail = json(lang, `email-commande-recue`);
    assert.ok(mail.variables.mentionTva, `${lang} : repère déclaré`);
    const i = mail.blocs.findIndex((b: { type: string }) => b.type === "commande");
    const note = mail.blocs[i + 1];
    // juste sous le détail de la commande, en petit, et seulement quand la mention existe
    assert.deepEqual([note.type, note.texte, note.si, note.taille], ["texte", "{mentionTva}", "mentionTva", "petite"]);
  }
});

test("mentions légales, assistante et données structurées suivent la franchise", () => {
  // l'assistante (lib/ai/maison.ts, qui lit aussi la FAQ en JSON) : la mention vient du même module
  const maison = readFileSync(new URL("../../lib/ai/maison.ts", import.meta.url), "utf8");
  assert.match(maison, /vatFranchise\(\)\s*\?\s*`Prix[^`]*\$\{MENTION_FRANCHISE\}/);
  const ml = json("fr", "mentions-legales");
  const tva = ml.sections.find((s: { id: string }) => s.id === "tva");
  assert.ok(texts(tva).includes(MENTION));
  assert.match(texts(json("en", "mentions-legales").sections.find((s: { id: string }) => s.id === "tva")).join(" "), /293 B/);
  // aucune TVA dans les données structurées, et plus l'ancienne adresse de l'entreprise
  const org = JSON.stringify(organizationSchema());
  assert.doesNotMatch(org, /vatID|Croissy|Déroulède/);
});
