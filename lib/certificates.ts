/**
 * Certificats d'authenticité numériques.
 *
 * Chaque pièce commandée reçoit un certificat : son NUMÉRO DE CRÉATION (numéro d'ordre de la Maison,
 * unique, attribué dans l'ordre à chaque pièce confectionnée, « Création n° 0001 »), un code de
 * vérification imprimé sous un QR code (serial), une page publique qui en atteste l'authenticité
 * (sans aucune donnée personnelle), et le rattachement au compte de sa propriétaire :
 * automatiquement pour l'acheteuse (même adresse e-mail), ou avec le code imprimé sur le certificat
 * papier quand la pièce est offerte. Les pièces sont créées sur demande : aucune série, aucun
 * numéro d'édition ni total.
 *
 * Stockage : Supabase (table certificates, numéro tiré de la séquence certificate_creation_seq) si
 * la base est configurée, sinon le stockage technique (compteur permanent kv.next).
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
  /** numéro de création unique de la Maison (null : certificat émis avant le modèle sur demande) */
  creationNumber: number | null;
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
export type PublicCertificate = Omit<Certificate, "ownerEmailHash" | "claimCodeHash" | "claimCodeSealed" | "customerId" | "orderNumber"> & {
  claimed: boolean;
  /** numéro de création sur quatre chiffres (« 0001 »), à composer avec le texte « Création n° {numero} » */
  creation: string | null;
};

/** Numéro de création affiché sur quatre chiffres au moins : 1 → « 0001 ». */
export const creationText = (n: number | null | undefined): string | null => (typeof n === "number" && n > 0 ? String(n).padStart(4, "0") : null);

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
/** code de vérification : AW-<pièce>-<numéro de création>-<4 signes> (anciens certificats : 2 chiffres) */
const SERIAL = /^AW-[A-Z0-9]{1,8}-\d{2,6}-[A-Z0-9]{4}$/;
/** compteur permanent des numéros de création (stockage technique, sans Supabase) */
export const CREATION_KEY = "certificates:creation";

// ------------------------------------------------------------------ stockage
async function demoAll(): Promise<Record<string, Certificate>> {
  return (await kv.get<Record<string, Certificate>>(KEY)) ?? {};
}

type Row = {
  serial: string; product_handle: string; product_title: string; size: string | null; image: string | null; creation_number: number | string | null;
  collection: string | null; made_on: string | null; materials: string | null; order_number: string | null; owner_email_hash: string | null; claim_code_hash: string | null;
  claim_code_sealed: string | null; creator_note: string | null; customer_id: string | null; claimed_at: string | null; created_at: string;
};
const fromRow = (r: Row): Certificate => ({
  serial: r.serial,
  productHandle: r.product_handle,
  productTitle: r.product_title,
  size: r.size ?? undefined,
  image: r.image ?? undefined,
  creationNumber: r.creation_number === null || r.creation_number === undefined ? null : Number(r.creation_number),
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
      serial: c.serial, product_handle: c.productHandle, product_title: c.productTitle, size: c.size ?? null, image: c.image ?? null, creation_number: c.creationNumber,
      collection: c.collection ?? null, made_on: c.madeOn, materials: c.materials, order_number: c.orderNumber ?? null,
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
    creationNumber: c.creationNumber,
    creation: creationText(c.creationNumber),
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

/**
 * Numéro de création suivant : tiré de façon atomique (séquence PostgreSQL, ou compteur permanent du
 * stockage technique), jamais deux fois le même même en cas de commandes simultanées, jamais remis
 * à zéro. Un numéro tiré pour une commande annulée n'est pas réattribué.
 */
async function nextCreationNumber(): Promise<number> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin().rpc("next_creation_number");
    if (error || data === null || data === undefined) throw new Error(`numéro de création : ${error?.message ?? "absent"}`);
    return Number(data);
  }
  return kv.next(CREATION_KEY);
}

async function issue(order: Order): Promise<{ certificate: Certificate; claimCode: string }[]> {
  const [products, collections] = await Promise.all([getAllProducts(), getCollections()]);
  const issued: { certificate: Certificate; claimCode: string }[] = [];
  for (const line of order.lines) {
    const p = products.find((x) => x.handle === line.handle);
    if (!p) continue;
    for (let i = 0; i < line.quantity; i++) {
      // pièces créées sur demande, sans série : un numéro de création unique de la Maison par pièce,
      // repris dans le code de vérification ; plus de numéro d'édition « N° x / y »
      const creation = await nextCreationNumber();
      const claimCode = `${random(4)}-${random(4)}`;
      const certificate: Certificate = {
        serial: `AW-${productCode(p)}-${creationText(creation)}-${random(4)}`,
        productHandle: p.handle,
        productTitle: p.title,
        size: line.size,
        image: p.images[0]?.src,
        creationNumber: creation,
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

/**
 * Certificats d'une commande avec leur lien et leur code de rattachement en clair, pour l'e-mail
 * « Commande reçue » (le code n'est jamais montré sur la page publique).
 */
export async function certificateCodesOfOrder(order: Pick<Order, "id">): Promise<{ productTitle: string; url: string; code: string | null }[]> {
  const serials = (await kv.get<string[]>(orderKey(order.id))) ?? [];
  const list = await Promise.all(serials.map((s) => getCertificate(s)));
  return list.filter((c): c is Certificate => Boolean(c)).map((c) => ({ productTitle: c.productTitle, url: certificateUrl(c.serial), code: claimCodeOf(c) }));
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

/**
 * Pièces d'une commande passées à « Prête » : la date de confection de leurs certificats devient
 * celle du jour (la créatrice peut encore la corriger dans l'Atelier).
 */
export async function markOrderMade(order: Pick<Order, "id">, at: string = new Date().toISOString()): Promise<void> {
  const serials = (await kv.get<string[]>(orderKey(order.id))) ?? [];
  for (const serial of serials) {
    const c = await getCertificate(serial);
    if (c) await save({ ...c, madeOn: at.slice(0, 10) });
  }
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
      ...issued.map((x) => `${x.certificate.productTitle}${x.certificate.creationNumber ? `, création n° ${creationText(x.certificate.creationNumber)}` : ""} : ${certificateUrl(x.certificate.serial)}`),
      `Si vous offrez une pièce, transmettez avec elle son code de rattachement : ${issued.map((x) => `${x.certificate.productTitle} : ${x.claimCode}`).join(" ; ")}.`,
    ],
    cta: { label: "Voir mes certificats", href: "/compte#certificats" },
    signature: "Avec toute notre gratitude,\nLa Créatrice",
    footnote: `Commande ${order.number}`,
  });
  await sendEmail({ to: order.email, subject: `Certificat d’authenticité de votre commande ${order.number}`, tag: "certificats", ...mail });
}
