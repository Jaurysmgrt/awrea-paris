/**
 * Avant-premières des collections.
 *
 * La page « Bientôt » (/bientot) annonce la prochaine collection de la Maison : son nom, sa date de
 * dévoilement, un texte et des images. Trois temps (règles : components/drops/regles.ts) :
 *  1. Annonce : la collection se présente sur « Bientôt » ; ses pièces quittent la boutique.
 *  2. Avant-première (earlyAccessAt) : les inscrites à la lettre de la Maison, et celles qui ont
 *     laissé leur adresse sur la page, ouvrent avec leur lien personnel l'accès à la commande des
 *     pièces, avant tout le monde.
 *  3. Dévoilement (publicAt) : les pièces rejoignent la boutique, ouvertes à toutes.
 * Une avant-première peut aussi être une « présentation privée » (champ privateSale) : jusqu'au
 * dévoilement, elle est réservée aux personnes qui ont le mot de passe transmis par la Maison. Aucun
 * prix particulier : seule la date d'accès change.
 *
 * Chaque pièce étant créée sur demande par des artisans français, une avant-première ne connaît ni
 * quantité ni rareté : elle avance seulement une date.
 *
 * Les règles d'accès sont appliquées côté serveur (panier, commande) ; la boutique ne montre les
 * pièces qu'au dévoilement. Stockage : configuration dans le stockage technique ; inscriptions de la
 * page dans la base clientes (table drop_signups) si elle est configurée, sinon dans le stockage
 * technique. Textes : content/site/fr/avant-premieres.json.
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "@/lib/store";
import { sign, verify } from "@/lib/auth/session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { readDoc } from "@/lib/edition/store";
import { fill } from "@/lib/edition/fill";
import { accessAllows, imagesOf, parisDate, phaseOf, type DropAccess, type DropPhase } from "@/components/drops/regles";
import type { Product } from "@/lib/commerce/types";

export type { DropAccess, DropPhase };

export interface Drop {
  slug: string;
  /** nom de la collection */
  title: string;
  /** texte de présentation (une ligne vide sépare deux paragraphes) */
  teaser: string;
  /** images de la collection (chemins /media/…) ; sans image, les photos des pièces */
  images?: string[];
  /** image unique des avant-premières enregistrées avant les images multiples */
  image?: string;
  /** pièces de la collection (handles) */
  products: string[];
  /** ouverture de l'avant-première (ISO) */
  earlyAccessAt: string;
  /** dévoilement à toutes (ISO) */
  publicAt: string;
  /** présentation privée : jusqu'au dévoilement, réservée aux détentrices du mot de passe */
  privateSale: boolean;
  /** la créatrice a choisi d'écrire aux inscrites à la lettre (lib/marketing/flows.ts) */
  notifyLetters?: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: string;
}

const KEY = "drops";
const COOKIE = "awrea_drops";
const DAY = 86_400;
const ACCESS_DAYS = 30;

const now = () => Date.now();
export function dropPhase(d: Drop, at = now()): DropPhase {
  return phaseOf(d, at);
}

/** Images à montrer pour une collection (celles choisies dans l'Atelier). */
export const dropImages = (d: Drop): string[] => imagesOf(d);

// ------------------------------------------------------------------ configuration
export async function listDrops(): Promise<Drop[]> {
  const all = (await kv.get<Drop[]>(KEY)) ?? [];
  return all.sort((a, b) => a.publicAt.localeCompare(b.publicAt));
}

export async function getDrop(slug: string): Promise<Drop | null> {
  return (await listDrops()).find((d) => d.slug === slug) ?? null;
}

/**
 * La prochaine collection pas encore dévoilée, celle de la page « Bientôt ». Une présentation privée
 * ne s'y montre jamais : elle n'a que son adresse, transmise par la Maison.
 */
export async function nextDrop({ includePrivate = false }: { includePrivate?: boolean } = {}): Promise<Drop | null> {
  return (await listDrops()).find((d) => dropPhase(d) !== "ouvert" && (includePrivate || !d.privateSale)) ?? null;
}

const hashPassword = (password: string, salt: string) => createHash("sha256").update(`drop:${salt}:${password.normalize("NFC")}`).digest("hex");

export async function saveDrop(input: Omit<Drop, "createdAt" | "passwordHash" | "passwordSalt" | "image"> & { password?: string | null }): Promise<Drop> {
  const all = (await kv.get<Drop[]>(KEY)) ?? [];
  const previous = all.find((d) => d.slug === input.slug);
  const { password, ...rest } = input;
  const drop: Drop = { ...previous, ...rest, createdAt: previous?.createdAt ?? new Date().toISOString() };
  // les images multiples remplacent l'ancienne image unique
  delete drop.image;
  if (password) {
    drop.passwordSalt = randomBytes(16).toString("hex");
    drop.passwordHash = hashPassword(password, drop.passwordSalt);
  }
  if (!drop.privateSale) {
    delete drop.passwordHash;
    delete drop.passwordSalt;
  }
  await kv.set(KEY, [...all.filter((d) => d.slug !== drop.slug), drop]);
  return drop;
}

export async function deleteDrop(slug: string) {
  const all = (await kv.get<Drop[]>(KEY)) ?? [];
  await kv.set(KEY, all.filter((d) => d.slug !== slug));
}

export function checkDropPassword(d: Drop, password: string): boolean {
  if (!d.privateSale || !d.passwordHash || !d.passwordSalt) return false;
  const a = Buffer.from(hashPassword(password, d.passwordSalt), "hex");
  const b = Buffer.from(d.passwordHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------------------------------------------------ inscriptions de la page
export async function signUpForDrop(slug: string, email: string, customerId?: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (isSupabaseConfigured) {
    const { error } = await supabaseAdmin().from("drop_signups").upsert({ drop_slug: slug, email: clean, customer_id: customerId ?? null }, { onConflict: "drop_slug,email" });
    if (error) throw new Error(`inscription : ${error.message}`);
    return;
  }
  const key = `drops:signups:${slug}`;
  const list = (await kv.get<{ email: string; date: string }[]>(key)) ?? [];
  if (!list.some((s) => s.email === clean)) await kv.set(key, [...list, { email: clean, date: new Date().toISOString() }]);
}

export async function dropSignups(slug: string): Promise<{ email: string; date: string }[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("drop_signups").select("email, created_at").eq("drop_slug", slug).order("created_at");
    return (data ?? []).map((r) => ({ email: r.email as string, date: r.created_at as string }));
  }
  return (await kv.get<{ email: string; date: string }[]>(`drops:signups:${slug}`)) ?? [];
}

export async function isSignedUp(slug: string, email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  return (await dropSignups(slug)).some((s) => s.email === clean);
}

// ------------------------------------------------------------------ lettre de la Maison
/** Lettres de l'avant-première déjà envoyées aux inscrites à la lettre (lib/marketing/flows.ts). */
export async function dropLettersSent(slug: string): Promise<number> {
  return (await kv.get<number>(`drops:lettres:${slug}`)) ?? 0;
}
export async function recordDropLetters(slug: string, sent: number): Promise<void> {
  if (sent > 0) await kv.set(`drops:lettres:${slug}`, (await dropLettersSent(slug)) + sent);
}

// ------------------------------------------------------------------ accès
/**
 * Durée d'un accès (lien de l'e-mail, cookie) : jusqu'au dévoilement, plus une semaine. Une lettre
 * envoyée dès l'annonce reste donc valable jusqu'à l'avant-première, même lointaine ; au moins
 * 30 jours, au plus un an.
 */
export function accessSeconds(d: Pick<Drop, "publicAt"> | null | undefined, at = now()): number {
  const until = d ? Math.ceil((Date.parse(d.publicAt) - at) / 1000) + 7 * DAY : 0;
  return Math.min(365 * DAY, Math.max(ACCESS_DAYS * DAY, Number.isFinite(until) ? until : 0));
}

/** Lien personnel envoyé par e-mail : ouvre l'avant-première dans le navigateur de l'inscrite. */
export function accessLinkToken(slug: string, email: string, seconds = ACCESS_DAYS * DAY): string {
  return sign({ d: slug, e: createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16) }, seconds);
}
export function verifyAccessLinkToken(token: string | null | undefined): { d: string } | null {
  return verify<{ d: string; e: string }>(token);
}

type AccessCookie = Record<string, DropAccess>;

async function readAccessCookie(): Promise<{ a: AccessCookie; exp: number }> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const v = verify<{ a: AccessCookie }>(raw);
  return { a: v?.a ?? {}, exp: v?.exp ?? 0 };
}

export async function readDropAccess(): Promise<AccessCookie> {
  return (await readAccessCookie()).a;
}

/**
 * Accorde un accès (lien de l'e-mail ou mot de passe de la présentation privée) : cookie signé,
 * httpOnly, gardé au moins aussi longtemps que les accès qu'il contient déjà.
 */
export async function grantDropAccess(slug: string, kind: DropAccess, seconds = ACCESS_DAYS * DAY) {
  const jar = await cookies();
  const current = await readAccessCookie();
  const next: AccessCookie = { ...current.a, [slug]: current.a[slug] === "prive" ? "prive" : kind };
  const age = Math.max(seconds, current.exp - Math.floor(now() / 1000));
  jar.set(COOKIE, sign({ a: next }, age), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: age });
}

/** La collection (pas encore dévoilée) à laquelle appartient une pièce. */
export async function dropOfProduct(handle: string, drops?: Drop[]): Promise<Drop | null> {
  const list = drops ?? (await listDrops());
  return list.find((d) => d.products.includes(handle) && dropPhase(d) !== "ouvert") ?? null;
}

/** Pourquoi une pièce ne se commande pas encore : clé des textes « refus » du document. */
export type BlockReason = "annonce" | "avantPremiere" | "privee";

/** La visiteuse peut-elle commander cette pièce maintenant ? Sinon, pourquoi. */
export function canBuy(d: Drop | null, access: AccessCookie, at = now()): { ok: true } | { ok: false; drop: Drop; reason: BlockReason } {
  if (!d || accessAllows(d, access[d.slug], at)) return { ok: true };
  const reason: BlockReason = d.privateSale ? "privee" : dropPhase(d, at) === "bientot" ? "annonce" : "avantPremiere";
  return { ok: false, drop: d, reason };
}

type DatesTexts = { dates: { valeur: string } };

/** Une date de l'avant-première, écrite comme dans les textes (« jeudi 5 novembre à 18 h »). */
export function dropDateText(t: DatesTexts, iso: string): string {
  return fill(t.dates.valeur, parisDate(iso));
}

/** Repères communs des textes d'une avant-première : {collection}, {avantPremiere}, {devoilement}. */
export function dropVars(t: DatesTexts, d: Pick<Drop, "title" | "earlyAccessAt" | "publicAt">): Record<string, string> {
  return { collection: d.title, avantPremiere: dropDateText(t, d.earlyAccessAt), devoilement: dropDateText(t, d.publicAt) };
}

/** Pièces visibles en boutique : sans les pièces d'une collection pas encore dévoilée. */
export async function hideUpcoming<T extends Pick<Product, "handle">>(products: T[]): Promise<T[]> {
  const drops = await listDrops();
  const hidden = new Set(drops.filter((d) => dropPhase(d) !== "ouvert").flatMap((d) => d.products));
  return hidden.size ? products.filter((p) => !hidden.has(p.handle)) : products;
}

type RefusTexts = DatesTexts & { refus: Record<BlockReason, string> };

/** Vérification côté serveur avant d'ajouter au panier ou de payer : le message lisible, ou null. */
export async function assertCanBuy(handles: string[]): Promise<string | null> {
  const drops = await listDrops();
  if (!drops.length) return null;
  const access = await readDropAccess();
  for (const h of new Set(handles)) {
    const r = canBuy(await dropOfProduct(h, drops), access);
    if (r.ok) continue;
    const t = (await readDoc("avant-premieres", "fr").catch(() => null)) as RefusTexts | null;
    // sans texte lisible, la commande reste refusée : le nom de la collection suffit à l'expliquer
    return t ? fill(t.refus[r.reason], dropVars(t, r.drop)) : r.drop.title;
  }
  return null;
}
