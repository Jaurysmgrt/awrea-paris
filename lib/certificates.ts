/**
 * Certificats d'authenticité numériques.
 *
 * Chaque pièce vendue reçoit un certificat : numéro de série imprimé sous un QR code, page publique
 * qui en atteste l'authenticité (sans aucune donnée personnelle), et rattachement au compte de sa
 * propriétaire — automatiquement pour l'acheteuse (même adresse e-mail), ou avec le code imprimé
 * sur le certificat papier quand la pièce est offerte.
 *
 * Stockage : Supabase (table certificates) si la base est configurée, sinon le stockage technique.
 */
import "server-only";
import { createHash, randomInt } from "node:crypto";
import QRCode from "qrcode";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { getAllProducts, getCollections } from "@/lib/commerce";
import { absolute } from "@/lib/seo/metadata";
import { palette } from "@/styles/tokens";
import { identity } from "@/content/brand/identity";
import { seal, unseal } from "@/lib/security/seal";
import type { Order, Product } from "@/lib/commerce/types";
import type { CustomerSession } from "@/lib/customers/types";

export interface Certificate {
  serial: string;
  productHandle: string;
  productTitle: string;
  size?: string;
  image?: string;
  editionNumber: number | null;
  editionTotal: number;
  collection?: string;
  madeOn: string;
  materials: string;
  orderNumber?: string;
  ownerEmailHash?: string;
  claimCodeHash?: string;
  /** le code de rattachement, chiffré : l'atelier l'imprime sur le certificat papier */
  claimCodeSealed?: string;
  /** le mot de la créatrice (à défaut, sa phrase fondatrice) */
  note?: string;
  customerId?: string;
  claimedAt?: string;
  createdAt: string;
}

/** Ce que la page publique montre : jamais l'e-mail, la commande ni le code. */
export type PublicCertificate = Omit<Certificate, "ownerEmailHash" | "claimCodeHash" | "claimCodeSealed" | "customerId" | "orderNumber"> & { claimed: boolean };

const KEY = "certificates";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I
const random = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const emailHash = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
const codeHash = (code: string) => createHash("sha256").update(`certificat:${code.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`).digest("hex");

function productCode(p: Product): string {
  const fromSku = p.variants[0]?.sku.split("-")[1];
  const code = (fromSku ?? p.handle.replace(/^[a-z]+-/, "").slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code || "AW";
}
const SERIAL = /^AW-[A-Z0-9]{1,8}-\d{2,4}-[A-Z0-9]{4}$/;

// ------------------------------------------------------------------ stockage
async function demoAll(): Promise<Record<string, Certificate>> {
  return (await kv.get<Record<string, Certificate>>(KEY)) ?? {};
}

type Row = {
  serial: string; product_handle: string; product_title: string; size: string | null; image: string | null; edition_number: number | null; edition_total: number | null;
  collection: string | null; made_on: string | null; materials: string | null; order_number: string | null; owner_email_hash: string | null; claim_code_hash: string | null;
  claim_code_sealed: string | null; creator_note: string | null; customer_id: string | null; claimed_at: string | null; created_at: string;
};
const fromRow = (r: Row): Certificate => ({
  serial: r.serial,
  productHandle: r.product_handle,
  productTitle: r.product_title,
  size: r.size ?? undefined,
  image: r.image ?? undefined,
  editionNumber: r.edition_number,
  editionTotal: r.edition_total ?? 1,
  collection: r.collection ?? undefined,
  madeOn: r.made_on ?? r.created_at.slice(0, 10),
  materials: r.materials ?? "",
  orderNumber: r.order_number ?? undefined,
  ownerEmailHash: r.owner_email_hash ?? undefined,
  claimCodeHash: r.claim_code_hash ?? undefined,
  claimCodeSealed: r.claim_code_sealed ?? undefined,
  note: r.creator_note ?? undefined,
  customerId: r.customer_id ?? undefined,
  claimedAt: r.claimed_at ?? undefined,
  createdAt: r.created_at,
});

async function save(c: Certificate) {
  if (isSupabaseConfigured) {
    const { error } = await supabaseAdmin().from("certificates").upsert({
      serial: c.serial, product_handle: c.productHandle, product_title: c.productTitle, size: c.size ?? null, image: c.image ?? null, edition_number: c.editionNumber,
      edition_total: c.editionTotal, collection: c.collection ?? null, made_on: c.madeOn, materials: c.materials, order_number: c.orderNumber ?? null,
      owner_email_hash: c.ownerEmailHash ?? null, claim_code_hash: c.claimCodeHash ?? null, claim_code_sealed: c.claimCodeSealed ?? null, creator_note: c.note ?? null,
      customer_id: c.customerId ?? null, claimed_at: c.claimedAt ?? null, created_at: c.createdAt,
    });
    if (error) throw new Error(`certificat : ${error.message}`);
    return;
  }
  const all = await demoAll();
  all[c.serial] = c;
  await kv.set(KEY, all);
}

export async function getCertificate(serial: string): Promise<Certificate | null> {
  const s = serial.toUpperCase();
  if (!SERIAL.test(s)) return null;
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("certificates").select("*").eq("serial", s).maybeSingle();
    return data ? fromRow(data as Row) : null;
  }
  return (await demoAll())[s] ?? null;
}

export function toPublic(c: Certificate): PublicCertificate {
  return {
    serial: c.serial,
    productHandle: c.productHandle,
    productTitle: c.productTitle,
    size: c.size,
    image: c.image,
    editionNumber: c.editionNumber,
    editionTotal: c.editionTotal,
    collection: c.collection,
    madeOn: c.madeOn,
    materials: c.materials,
    note: c.note,
    claimedAt: c.claimedAt,
    createdAt: c.createdAt,
    claimed: Boolean(c.customerId || c.claimedAt),
  };
}

/** Certificats de la cliente : ceux de ses achats (même e-mail) et ceux qu'elle a rattachés. */
export async function certificatesFor(session: CustomerSession): Promise<PublicCertificate[]> {
  const hash = emailHash(session.email);
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("certificates").select("*").or(`owner_email_hash.eq.${hash},customer_id.eq.${session.id}`).order("created_at", { ascending: false });
    return ((data ?? []) as Row[]).map(fromRow).map(toPublic);
  }
  return Object.values(await demoAll())
    .filter((c) => c.ownerEmailHash === hash || c.customerId === session.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toPublic);
}

// ------------------------------------------------------------------ émission
const orderKey = (orderId: string) => `certificates:order:${orderId}`;

/**
 * Émet un certificat par pièce commandée, une seule fois par commande même si Shopify renvoie le
 * webhook (verrou atomique). Renvoie les certificats et leurs codes de rattachement, à
 * transmettre une seule fois (e-mail, carte papier).
 */
export async function issueCertificates(order: Order): Promise<{ certificate: Certificate; claimCode: string }[]> {
  const lock = `certificates:lock:${order.id}`;
  if ((await kv.incr(lock, 30 * 86_400)) > 1) return [];
  try {
    return await issue(order);
  } catch (e) {
    await kv.del(lock); // nouvel essai possible au prochain envoi du webhook
    throw e;
  }
}

async function issue(order: Order): Promise<{ certificate: Certificate; claimCode: string }[]> {
  const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
  const issued: { certificate: Certificate; claimCode: string }[] = [];
  for (const line of order.lines) {
    const p = products.find((x) => x.handle === line.handle);
    if (!p) continue;
    for (let i = 0; i < line.quantity; i++) {
      const fromLabel = line.editionLabel?.match(/N°\s*(\d+)/)?.[1];
      let number: number | null = fromLabel ? Number(fromLabel) : p.edition.total === 1 ? 1 : null;
      if (number === null && !/commande/i.test(line.editionLabel ?? "")) {
        // pilote Shopify : numéro attribué ici, de façon atomique
        const n = await kv.incr(`edition:${p.handle}`, 10 * 365 * 86_400);
        number = p.edition.produced + n <= p.edition.total ? p.edition.produced + n : null;
      }
      const claimCode = `${random(4)}-${random(4)}`;
      const certificate: Certificate = {
        serial: `AW-${productCode(p)}-${String(number ?? 0).padStart(2, "0")}-${random(4)}`,
        productHandle: p.handle,
        productTitle: p.title,
        size: line.size,
        image: p.images[0]?.src,
        editionNumber: number,
        editionTotal: p.edition.total,
        collection: collections.find((c) => c.handle === p.collection)?.title,
        madeOn: order.createdAt.slice(0, 10),
        materials: p.materials.map((m) => `${m.percent}\u202f% ${m.name.toLowerCase()}`).join(", "), // espace fine insécable
        orderNumber: order.number,
        ownerEmailHash: order.email ? emailHash(order.email) : undefined,
        claimCodeHash: codeHash(claimCode),
        claimCodeSealed: seal("certificat", claimCode),
        createdAt: new Date().toISOString(),
      };
      await save(certificate);
      issued.push({ certificate, claimCode });
    }
  }
  await kv.set(orderKey(order.id), issued.map((x) => x.certificate.serial));
  return issued;
}

export async function certificatesOfOrder(order: Pick<Order, "id">): Promise<PublicCertificate[]> {
  const serials = (await kv.get<string[]>(orderKey(order.id))) ?? [];
  const list = await Promise.all(serials.map((s) => getCertificate(s)));
  return list.filter((c): c is Certificate => Boolean(c)).map(toPublic);
}

/** Rattache un certificat au compte de la cliente connectée, avec le code du certificat papier. */
export async function claimCertificate(serial: string, code: string, session: CustomerSession): Promise<"ok" | "inconnu" | "code"> {
  const c = await getCertificate(serial);
  if (!c) return "inconnu";
  if (!c.claimCodeHash || c.claimCodeHash !== codeHash(code)) return "code";
  await save({ ...c, customerId: session.id, ownerEmailHash: emailHash(session.email), claimedAt: new Date().toISOString() });
  return "ok";
}

// ------------------------------------------------------------------ atelier
/** Le mot de la créatrice imprimé sur le certificat : le sien pour cette pièce, sinon sa phrase fondatrice. */
export const creatorWord = (c: Pick<Certificate, "note">) => c.note?.trim() || identity.founderQuote;

/** Certificats émis, du plus récent au plus ancien (filtre facultatif par commande). */
export async function listCertificates({ order, limit = 200 }: { order?: string; limit?: number } = {}): Promise<Certificate[]> {
  if (isSupabaseConfigured) {
    let q = supabaseAdmin().from("certificates").select("*").order("created_at", { ascending: false }).limit(limit);
    if (order) q = q.eq("order_number", order);
    const { data } = await q;
    return ((data ?? []) as Row[]).map(fromRow);
  }
  return Object.values(await demoAll())
    .filter((c) => !order || c.orderNumber === order)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** Corrige la date de fabrication ou écrit le mot de la créatrice (Atelier). */
export async function updateCertificate(serial: string, patch: { madeOn?: string; note?: string | null }): Promise<Certificate | null> {
  const c = await getCertificate(serial);
  if (!c) return null;
  const next: Certificate = { ...c, madeOn: patch.madeOn ?? c.madeOn, note: patch.note === undefined ? c.note : patch.note?.trim() || undefined };
  await save(next);
  return next;
}

/** Le code de rattachement en clair, pour l'impression du certificat papier par l'atelier. */
export const claimCodeOf = (c: Certificate): string | null => (c.claimCodeSealed ? unseal("certificat", c.claimCodeSealed) : null);

export function certificateUrl(serial: string): string {
  return absolute(`/certificat/${serial}`);
}

export async function certificateQr(serial: string): Promise<string> {
  return QRCode.toString(certificateUrl(serial), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: palette.ink, light: "#0000" } });
}

/**
 * Pilote Shopify : Shopify envoie la confirmation de commande ; la maison envoie à part les
 * certificats (liens et codes de rattachement à transmettre si la pièce est offerte).
 */
export async function sendCertificatesEmail(order: Order, issued: { certificate: Certificate; claimCode: string }[]) {
  if (!issued.length || !order.email) return;
  const { brandEmail } = await import("@/lib/email/templates");
  const { sendEmail } = await import("@/lib/email/send");
  const first = order.name.split(" ")[0];
  const mail = brandEmail({
    preheader: "Le certificat d’authenticité de votre pièce est en ligne.",
    title: issued.length > 1 ? "Vos certificats d’authenticité" : "Votre certificat d’authenticité",
    paragraphs: [
      first ? `Bonjour ${first},` : "Bonjour,",
      "Chaque pièce Awrea Paris est accompagnée d’un certificat signé par la créatrice. Sa version numérique est déjà en ligne, et rattachée à votre compte si vous en avez un avec cette adresse.",
      ...issued.map((x) => `${x.certificate.productTitle}${x.certificate.editionNumber && x.certificate.editionTotal > 1 ? `, N° ${x.certificate.editionNumber} / ${x.certificate.editionTotal}` : ""} — ${certificateUrl(x.certificate.serial)}`),
      `Si vous offrez une pièce, transmettez avec elle son code de rattachement : ${issued.map((x) => `${x.certificate.productTitle} : ${x.claimCode}`).join(" ; ")}.`,
    ],
    cta: { label: "Voir mes certificats", href: "/compte#certificats" },
    signature: "Avec toute notre gratitude,\nLa Créatrice",
    footnote: `Commande ${order.number}`,
  });
  await sendEmail({ to: order.email, subject: `Certificat d’authenticité — commande ${order.number}`, tag: "certificats", ...mail });
}
