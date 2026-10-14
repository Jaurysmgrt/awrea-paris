/**
 * Facture ou avoir en PDF (A4), dans la direction artistique de la maison : noir sur blanc cassé,
 * Instrument Serif pour les titres, Inter Tight pour le texte, filets fins, marges de 48 points.
 * Mentions obligatoires : vendeuse (registre légal), acheteuse, numéro, dates, désignation,
 * quantités, prix unitaires hors taxes, taux et montant de TVA, totaux, paiement, régime de TVA.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { legalFields, type LegalFieldKey } from "@/content/legal/fields";
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import { logoPaths } from "@/content/brand/logo-paths";
import { palette } from "@/styles/tokens";
import { formatDate, formatPrice } from "@/lib/format";
import type { Invoice } from "./index";

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex(palette.ink);
const SOFT = hex(palette.taupeDeep);
const LINE = hex(palette.pearl);
const PAPER = hex(palette.ivory);

/** « carte bancaire », « paiement en 3 ou 4 fois », mais « PayPal », « Apple Pay » (noms propres) */
const payment = (m: string) => (/^(Carte|Paiement)/.test(m) ? m.charAt(0).toLowerCase() + m.slice(1) : m);
const field = (k: LegalFieldKey) => legalFields[k].value || `[À COMPLÉTER : ${legalFields[k].short}]`;
const countryName = (code?: string) => shop.countries.find((c) => c.code === code)?.name ?? code ?? "";

let fonts: Promise<Record<"display" | "light" | "regular", Uint8Array>> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), "assets", "pdf");
  fonts ??= Promise.all(["InstrumentSerif-Regular.ttf", "InterTight-300.ttf", "InterTight-400.ttf"].map((f) => fs.readFile(path.join(dir, f)))).then(([display, light, regular]) => ({
    display: new Uint8Array(display),
    light: new Uint8Array(light),
    regular: new Uint8Array(regular),
  }));
  return fonts;
}

/** Coupe un texte en lignes qui tiennent dans `width`. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function invoicePdf(inv: Invoice): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = await loadFonts();
  const display = await doc.embedFont(f.display, { subset: true });
  const light = await doc.embedFont(f.light, { subset: true });
  const regular = await doc.embedFont(f.regular, { subset: true });
  const title = `${inv.kind === "facture" ? "Facture" : "Avoir"} ${inv.number}`;
  doc.setTitle(`${title} — ${identity.name}`);
  doc.setAuthor(identity.name);
  doc.setCreator(identity.name);
  doc.setLanguage("fr-FR");

  const W = 595.28;
  const H = 841.89;
  const M = 48;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, size: number, font: PDFFont = light, color = INK) => page.drawText(s, { x, y, size, font, color });
  const right = (s: string, xRight: number, size: number, font: PDFFont = light, color = INK) => page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y, size, font, color });
  const rule = (weight = 0.5, color = LINE) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: weight, color });
  // petites capitales espacées (0,14 em, comme sur le site) : espacement natif du PDF
  const label = (s: string, x: number, size: number, color = INK, alignRight = false) => {
    const t = s.toUpperCase();
    const spacing = size * 0.14;
    const width = regular.widthOfTextAtSize(t, size) + spacing * (t.length - 1);
    page.pushOperators(setCharacterSpacing(spacing));
    page.drawText(t, { x: alignRight ? x - width : x, y, size, font: regular, color });
    page.pushOperators(setCharacterSpacing(0));
  };
  const ensure = (needed: number) => {
    if (y - needed > M + 72) return;
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
    y = H - M;
  };
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  // en-tête : logo à gauche, titre à droite
  const [, , lw, lh] = logoPaths.viewBox.split(" ").map(Number);
  const logoScale = 64 / lw;
  for (const d of [logoPaths.aw, logoPaths.paris]) page.drawSvgPath(d, { x: M, y: y, scale: logoScale, color: INK });
  y -= 8;
  right(title, W - M, 24, display);
  y -= 18;
  right(`Émis le ${formatDate(inv.issuedAt)}`, W - M, 9);
  y -= 13;
  right(`Commande ${inv.orderNumber} du ${formatDate(inv.saleDate)}`, W - M, 9);
  if (inv.refOf) {
    y -= 13;
    right(`Annule et remplace en partie la facture ${inv.refOf}`, W - M, 9);
  }
  y = H - M - lh * logoScale - 32;

  // vendeuse et acheteuse
  const col2 = W / 2 + 8;
  const sellerLines = [
    `${field("raisonSociale")} — ${field("formeJuridique")}`,
    legalFields.capital.value ? `Capital de ${legalFields.capital.value}` : "",
    field("siege"),
    `SIRET ${field("siret")} · ${field("immatriculation")}`,
    /293\s*B/i.test(legalFields.tva.value) ? "" : `TVA intracommunautaire ${field("tva")}`,
    identity.email,
  ].filter(Boolean);
  const a = inv.buyer.address;
  const buyerLines = [
    inv.buyer.name,
    ...(a ? [a.line1, a.line2 ?? "", `${a.postalCode} ${a.city}`, countryName(a.country)] : []),
    inv.buyer.email,
  ].filter(Boolean);
  const top = y;
  label("Vendeuse", M, 7, SOFT);
  y -= 16;
  for (const l of sellerLines) for (const w of wrap(l, light, 9, W / 2 - M - 16)) {
    text(w, M, 9);
    y -= 13;
  }
  const leftEnd = y;
  y = top;
  label("Facturé à", col2, 7, SOFT);
  y -= 16;
  for (const l of buyerLines) for (const w of wrap(l, light, 9, W - M - col2)) {
    text(w, col2, 9);
    y -= 13;
  }
  y = Math.min(y, leftEnd) - 24;

  // lignes
  const cols = { qty: W - M - 220, unit: W - M - 150, vat: W - M - 80, total: W - M };
  rule(0.75, INK);
  y -= 14;
  label("Désignation", M, 7);
  label("Qté", cols.qty, 7, INK, true);
  label("PU HT", cols.unit, 7, INK, true);
  label("TVA", cols.vat, 7, INK, true);
  label("Total HT", cols.total, 7, INK, true);
  y -= 10;
  rule();
  const rate = inv.vatRate;
  for (const l of inv.lines) {
    ensure(40);
    y -= 16;
    const unitHt = rate ? Math.round(l.unitTtc / (1 + rate)) : l.unitTtc;
    text(l.title, M, 10, display);
    right(String(l.quantity), cols.qty, 9);
    right(formatPrice(unitHt), cols.unit, 9);
    right(`${Math.round(rate * 1000) / 10} %`, cols.vat, 9);
    right(formatPrice(unitHt * l.quantity), cols.total, 9);
    if (l.detail) {
      y -= 12;
      text(l.detail, M, 8, light, SOFT);
    }
    y -= 8;
    rule();
  }

  // totaux
  ensure(140);
  y -= 20;
  const totalsRow = (label: string, value: string, strong = false) => {
    text(label, cols.vat - 160, strong ? 10 : 9, strong ? regular : light);
    right(value, cols.total, strong ? 10 : 9, strong ? regular : light);
    y -= 15;
  };
  totalsRow("Total hors taxes", formatPrice(inv.totals.ht));
  if (inv.regime === "tva") totalsRow(`TVA ${Math.round(rate * 1000) / 10} %`, formatPrice(inv.totals.vat));
  if (inv.totals.duty) totalsRow("Droits de douane du pays d’arrivée", formatPrice(inv.totals.duty));
  if (inv.totals.importVat) totalsRow("Taxe à l’importation du pays d’arrivée", formatPrice(inv.totals.importVat));
  totalsRow(inv.kind === "facture" ? "Total payé" : "Total remboursé", formatPrice(inv.totals.ttc), true);
  if (inv.giftCard) totalsRow("dont carte cadeau", formatPrice(inv.giftCard));

  // mentions
  y -= 12;
  const notes = [
    inv.kind === "facture" ? `Réglée le ${formatDate(inv.saleDate)} par ${payment(inv.paymentMethod)}.` : `Remboursement par ${payment(inv.paymentMethod)}${inv.reason ? ` — ${inv.reason}` : ""}.`,
    inv.regime === "franchise" ? "TVA non applicable, article 293 B du code général des impôts." : "",
    inv.regime === "export" ? "Exonération de TVA, article 262 I du code général des impôts (livraison hors de l’Union européenne). Droits et taxes du pays d’arrivée réglés à la commande." : "",
    "Pièces façonnées à la main à Paris. Facture conservée dix ans par la maison.",
  ].filter(Boolean);
  for (const n of notes) for (const w of wrap(n, light, 8, W - 2 * M)) {
    ensure(20);
    text(w, M, 8, light, SOFT);
    y -= 12;
  }

  // pied de page
  for (const p of doc.getPages()) {
    p.drawLine({ start: { x: M, y: M + 16 }, end: { x: W - M, y: M + 16 }, thickness: 0.5, color: LINE });
    p.drawText(`${identity.name} · ${field("siege")} · ${identity.email}`, { x: M, y: M, size: 7, font: light, color: SOFT });
  }
  return doc.save();
}
