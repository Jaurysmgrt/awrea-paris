/**
 * Étiquettes de retour (interrupteur LABELS_PROVIDER, lib/config/providers.ts).
 * - `colissimo` : étiquette prépayée « Colissimo Retour France » (service web d'affranchissement
 *   de La Poste, contrat Colissimo de la maison) pour les retours depuis la France ;
 * - `mock` : étiquette de démonstration, produite à la volée.
 * Hors de France, le retour reste à la charge de la cliente (CGV) : elle reçoit un bordereau à
 * coller sur son colis, avec l'adresse de l'atelier et le numéro de retour.
 * Si le prestataire échoue, la demande est enregistrée quand même, l'atelier est prévenu et dépose
 * l'étiquette dans l'Atelier (envoyée à la cliente par e-mail) : jamais de cliente bloquée.
 */
import "server-only";
import { randomInt } from "node:crypto";
import QRCode from "qrcode";
import { PDFDocument, rgb, setCharacterSpacing } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "node:fs";
import path from "node:path";
import { kv } from "@/lib/store";
import { providerOf } from "@/lib/config/providers";
import { identity } from "@/content/brand/identity";
import { logoPaths } from "@/content/brand/logo-paths";
import { palette } from "@/styles/tokens";
import type { Order } from "@/lib/commerce/types";
import type { ReturnLabel, ReturnRequest } from "./returns";

const labelKey = (id: string) => `labels:${id}`;

/** Adresse de l'atelier (destinataire des retours) ; repère visible tant qu'elle n'est pas renseignée. */
export function atelierAddress() {
  const a = identity.address;
  return {
    name: identity.name,
    line: a.streetAddress || "[À COMPLÉTER : adresse de l’atelier]",
    zip: a.postalCode || "",
    city: a.addressLocality,
    country: a.addressCountry,
    ready: Boolean(a.streetAddress && a.postalCode),
  };
}

export async function storedLabel(id: string): Promise<Uint8Array | null> {
  const b64 = await kv.get<string>(labelKey(id));
  return b64 ? new Uint8Array(Buffer.from(b64, "base64")) : null;
}

export async function storeLabel(id: string, pdf: Uint8Array) {
  await kv.set(labelKey(id), Buffer.from(pdf).toString("base64"));
}

/** Demande l'étiquette au prestataire ; renvoie le libellé enregistré avec le retour. */
export async function createReturnLabel(r: ReturnRequest, order: Order): Promise<{ label?: ReturnLabel; pending?: boolean }> {
  const now = new Date().toISOString();
  const fromFrance = (order.address?.country ?? order.shipping.country) === "FR";
  if (!fromFrance) return { label: { provider: "mock", carrier: "Bordereau de retour (envoi à votre charge)", tracking: r.id, createdAt: now } };
  if (providerOf("labels") !== "colissimo") {
    return { label: { provider: "mock", carrier: "Colissimo (démonstration)", tracking: `DEMO${randomInt(10 ** 9, 10 ** 10 - 1)}`, createdAt: now } };
  }
  try {
    const { parcelNumber, pdf } = await colissimoReturnLabel(r, order);
    await storeLabel(r.id, pdf);
    return { label: { provider: "colissimo", carrier: "Colissimo Retour", tracking: parcelNumber, createdAt: now } };
  } catch (e) {
    console.error("[étiquette] Colissimo :", e instanceof Error ? e.message : e);
    return { pending: true };
  }
}

/**
 * Service web d'affranchissement Colissimo (REST, JSON) — produit « CORE » : retour France.
 * La réponse est un message en plusieurs parties : le compte rendu JSON, puis l'étiquette PDF.
 */
async function colissimoReturnLabel(r: ReturnRequest, order: Order): Promise<{ parcelNumber: string; pdf: Uint8Array }> {
  const a = order.address!;
  const to = atelierAddress();
  if (!to.ready) throw new Error("adresse de l’atelier à compléter (content/brand/identity.ts)");
  const body = {
    contractNumber: process.env.COLISSIMO_CONTRACT_NUMBER,
    password: process.env.COLISSIMO_PASSWORD,
    outputFormat: { x: 0, y: 0, outputPrintingType: "PDF_A4_300dpi" },
    letter: {
      service: { productCode: "CORE", depositDate: new Date().toISOString().slice(0, 10), orderNumber: r.id, commercialName: identity.name },
      parcel: { weight: 0.8 },
      sender: { senderParcelRef: r.id, address: { lastName: a.lastName, firstName: a.firstName, line2: a.line1, line3: a.line2 ?? "", countryCode: "FR", city: a.city, zipCode: a.postalCode, email: order.email } },
      addressee: { addresseeParcelRef: order.number, address: { companyName: to.name, line2: to.line, countryCode: "FR", city: to.city, zipCode: to.zip } },
    },
  };
  const res = await fetch("https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0/generateLabel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = buf.toString("latin1");
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}", raw.indexOf("%PDF") > 0 ? raw.indexOf("%PDF") : raw.length) + 1);
  const report = JSON.parse(json) as { messages?: { type: string; messageContent: string }[]; labelV2Response?: { parcelNumber?: string } };
  const error = report.messages?.find((m) => m.type === "ERROR");
  if (!res.ok || error || !report.labelV2Response?.parcelNumber) throw new Error(error?.messageContent ?? `réponse ${res.status}`);
  const start = buf.indexOf("%PDF");
  const end = buf.lastIndexOf("%%EOF");
  if (start < 0 || end < 0) throw new Error("étiquette PDF absente de la réponse");
  return { parcelNumber: report.labelV2Response.parcelNumber, pdf: new Uint8Array(buf.subarray(start, end + 5)) };
}

/** Étiquette (ou bordereau) de démonstration : A4, la partie à découper en haut. */
export async function demoLabelPdf(r: ReturnRequest, order: Order): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "assets", "pdf");
  const [display, regular] = await Promise.all([fs.readFile(path.join(dir, "InstrumentSerif-Regular.ttf")), fs.readFile(path.join(dir, "InterTight-400.ttf"))]);
  const serif = await doc.embedFont(display, { subset: true });
  const sans = await doc.embedFont(regular, { subset: true });
  const ink = rgb(...([1, 3, 5].map((i) => parseInt(palette.ink.slice(i, i + 2), 16) / 255) as [number, number, number]));
  const page = doc.addPage([595.28, 841.89]);
  const M = 48;
  const prepaid = r.label?.provider !== "mock" || !r.label.carrier.startsWith("Bordereau");
  // cadre de découpe : format d'étiquette 15 × 10 cm
  const W = 425;
  const H = 283;
  const top = 841.89 - M;
  page.drawRectangle({ x: M, y: top - H, width: W, height: H, borderColor: ink, borderWidth: 0.75, borderDashArray: [4, 3] });
  let y = top - 32;
  const t = (s: string, x: number, size: number, font = sans) => page.drawText(s, { x, y, size, font, color: ink });
  const label = (s: string, x: number) => {
    page.pushOperators(setCharacterSpacing(1));
    t(s.toUpperCase(), x, 7);
    page.pushOperators(setCharacterSpacing(0));
  };
  t(prepaid ? "Retour prépayé — démonstration" : "Bordereau de retour", M + 16, 14, serif);
  y -= 14;
  t(r.label?.carrier ?? "", M + 16, 8);
  const qr = await QRCode.toBuffer(`${r.id} ${r.label?.tracking ?? ""}`, { margin: 0, width: 240, color: { dark: palette.ink, light: "#ffffff" } });
  const qrImg = await doc.embedPng(qr);
  page.drawImage(qrImg, { x: M + W - 16 - 96, y: top - 16 - 96, width: 96, height: 96 });
  y -= 30;
  label("Expéditrice", M + 16);
  const a = order.address;
  const from = a ? [`${a.firstName} ${a.lastName}`, a.line1, `${a.postalCode} ${a.city}`] : [order.name];
  for (const l of from) {
    y -= 13;
    t(l, M + 16, 9);
  }
  y -= 24;
  label("Destinataire", M + 16);
  const to = atelierAddress();
  for (const l of [to.name, to.line, `${to.zip} ${to.city}`.trim(), "France"]) {
    y -= 15;
    t(l, M + 16, 11);
  }
  y -= 28;
  t(`Retour ${r.id} · commande ${r.orderNumber} · suivi ${r.label?.tracking ?? "—"}`, M + 16, 8);
  // consignes sous le cadre
  y = top - H - 40;
  for (const l of [
    "1. Imprimez cette page, découpez l’étiquette et collez-la sur le colis.",
    "2. Glissez dans le colis la pièce non portée, ses étiquettes et son certificat.",
    prepaid ? "3. Déposez le colis dans un bureau de poste ou un point de retrait Colissimo." : "3. Déposez le colis chez le transporteur de votre choix (envoi à votre charge, avec suivi).",
    "Nous vous écrivons dès que l’atelier l’a reçu.",
  ]) {
    t(l, M, 9);
    y -= 15;
  }
  for (const d of [logoPaths.aw, logoPaths.paris]) page.drawSvgPath(d, { x: 595.28 - M - 40, y: 48 + 40, scale: 40 / Number(logoPaths.viewBox.split(" ")[2]), color: ink });
  return doc.save();
}
