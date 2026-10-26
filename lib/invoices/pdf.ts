/**
 * Facture ou avoir en PDF (A4), dans la direction artistique de la Maison : noir sur blanc cassé,
 * logo officiel, Fraunces italique pour les titres, Cormorant Garamond pour le texte (polices
 * officielles en TTF dans assets/pdf), filets fins, marges de 48 points.
 * Mentions obligatoires : vendeuse (registre légal), acheteuse, numéro, dates, désignation,
 * quantités, prix unitaires hors taxes, taux et montant de TVA, totaux, paiement, régime de TVA.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { legalFields, type LegalFieldKey } from "@/content/legal/fields";
import { identity } from "@/content/brand/identity";
import { shop } from "@/content/settings";
import { brandAssets } from "@/content/brand/assets";
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

/** Polices officielles (une seule graisse chacune) : titres en Fraunces 72pt Italic, texte en Cormorant Garamond. */
let fonts: Promise<Record<"display" | "text", Uint8Array>> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), "assets", "pdf");
  fonts ??= Promise.all(["Fraunces72pt-Italic.ttf", "CormorantGaramond-Regular.ttf"].map((f) => fs.readFile(path.join(dir, f)))).then(([display, text]) => ({
    display: new Uint8Array(display),
    text: new Uint8Array(text),
  }));
  return fonts;
}

/** Logo officiel (PNG noir à fond transparent, content/brand/assets.ts) ; s'il manque, le nom de la Maison le remplace. */
let logoBytes: Promise<Uint8Array | null> | null = null;
async function embedLogo(doc: PDFDocument): Promise<PDFImage | null> {
  const src = brandAssets.logo.src;
  logoBytes ??= src?.endsWith(".png") ? fs.readFile(path.join(process.cwd(), "public", src)).then((b) => new Uint8Array(b), () => null) : Promise.resolve(null);
  const bytes = await logoBytes;
  return bytes ? doc.embedPng(bytes).catch(() => null) : null;
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
  const body = await doc.embedFont(f.text, { subset: true });
  const logo = await embedLogo(doc);
  const title = `${inv.kind === "facture" ? "Facture" : "Avoir"} ${inv.number}`;
  doc.setTitle(`${title} · ${identity.name}`);
  doc.setAuthor(identity.name);
  doc.setCreator(identity.name);
  doc.setLanguage("fr-FR");

  const W = 595.28;
  const H = 841.89;
  const M = 48;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, size: number, font: PDFFont = body, color = INK) => page.drawText(s, { x, y, size, font, color });
  const right = (s: string, xRight: number, size: number, font: PDFFont = body, color = INK) => page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y, size, font, color });
  const rule = (weight = 0.5, color = LINE) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: weight, color });
  // capitales à l'interlettrage mesuré (0,08 em, comme les étiquettes du site) : espacement natif du PDF
  const label = (s: string, x: number, size: number, color = INK, alignRight = false) => {
    const t = s.toUpperCase();
    const spacing = size * 0.08;
    const width = body.widthOfTextAtSize(t, size) + spacing * (t.length - 1);
    page.pushOperators(setCharacterSpacing(spacing));
    page.drawText(t, { x: alignRight ? x - width : x, y, size, font: body, color });
    page.pushOperators(setCharacterSpacing(0));
  };
  const ensure = (needed: number) => {
    if (y - needed > M + 72) return;
    page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
    y = H - M;
  };
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  // en-tête : logo officiel à gauche, titre à droite
  const logoW = 112;
  const logoH = logo ? (logoW * logo.height) / logo.width : 24;
  if (logo) page.drawImage(logo, { x: M, y: H - M - logoH, width: logoW, height: logoH });
  else {
    y -= 20;
    text(identity.name, M, 20, display);
    y = H - M;
  }
  y -= 20;
  right(title, W - M, 24, display);
  y -= 20;
  right(`Émis le ${formatDate(inv.issuedAt)}`, W - M, 11);
  y -= 15;
  right(`Commande ${inv.orderNumber} du ${formatDate(inv.saleDate)}`, W - M, 11);
  if (inv.refOf) {
    y -= 15;
    right(`Annule et remplace en partie la facture ${inv.refOf}`, W - M, 11);
  }
  y = Math.min(y, H - M - logoH) - 32;

  // vendeuse et acheteuse
  const col2 = W / 2 + 8;
  const sellerLines = [
    `${field("raisonSociale")}, ${field("formeJuridique")}`,
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
  label("Vendeuse", M, 9, SOFT);
  y -= 18;
  for (const l of sellerLines) for (const w of wrap(l, body, 11, W / 2 - M - 16)) {
    text(w, M, 11);
    y -= 15;
  }
  const leftEnd = y;
  y = top;
  label("Facturé à", col2, 9, SOFT);
  y -= 18;
  for (const l of buyerLines) for (const w of wrap(l, body, 11, W - M - col2)) {
    text(w, col2, 11);
    y -= 15;
  }
  y = Math.min(y, leftEnd) - 24;

  // lignes
  const cols = { qty: W - M - 220, unit: W - M - 150, vat: W - M - 80, total: W - M };
  rule(0.75, INK);
  y -= 15;
  label("Désignation", M, 9);
  label("Qté", cols.qty, 9, INK, true);
  label("PU HT", cols.unit, 9, INK, true);
  label("TVA", cols.vat, 9, INK, true);
  label("Total HT", cols.total, 9, INK, true);
  y -= 10;
  rule();
  const rate = inv.vatRate;
  for (const l of inv.lines) {
    ensure(40);
    y -= 18;
    const unitHt = rate ? Math.round(l.unitTtc / (1 + rate)) : l.unitTtc;
    text(l.title, M, 12, body);
    right(String(l.quantity), cols.qty, 11);
    right(formatPrice(unitHt), cols.unit, 11);
    right(`${Math.round(rate * 1000) / 10} %`, cols.vat, 11);
    right(formatPrice(unitHt * l.quantity), cols.total, 11);
    if (l.detail) {
      y -= 14;
      text(l.detail, M, 10, body, SOFT);
    }
    y -= 8;
    rule();
  }

  // totaux
  ensure(140);
  y -= 20;
  // une seule graisse, et Fraunces seulement en grand (titre) : le total se distingue par sa taille
  const totalsRow = (label: string, value: string, strong = false) => {
    text(label, cols.vat - 160, strong ? 14 : 11, body);
    right(value, cols.total, strong ? 14 : 11, body);
    y -= 17;
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
    inv.kind === "facture" ? `Réglée le ${formatDate(inv.saleDate)} par ${payment(inv.paymentMethod)}.` : `Remboursement par ${payment(inv.paymentMethod)}${inv.reason ? `, ${inv.reason}` : ""}.`,
    inv.regime === "franchise" ? "TVA non applicable, article 293 B du code général des impôts." : "",
    inv.regime === "export" ? "Exonération de TVA, article 262 I du code général des impôts (livraison hors de l’Union européenne). Droits et taxes du pays d’arrivée réglés à la commande." : "",
    "Pièces créées sur demande par des artisans français. Facture conservée dix ans par la Maison.",
  ].filter(Boolean);
  for (const n of notes) for (const w of wrap(n, body, 10, W - 2 * M)) {
    ensure(20);
    text(w, M, 10, body, SOFT);
    y -= 14;
  }

  // pied de page
  for (const p of doc.getPages()) {
    p.drawLine({ start: { x: M, y: M + 16 }, end: { x: W - M, y: M + 16 }, thickness: 0.5, color: LINE });
    p.drawText(`${identity.name} · ${field("siege")} · ${identity.email}`, { x: M, y: M, size: 9, font: body, color: SOFT });
  }
  return doc.save();
}
