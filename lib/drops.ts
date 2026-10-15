/**
 * Drops et lancements.
 *
 * Une nouvelle série se dévoile en trois temps :
 *  1. « Bientôt » : la page /bientot montre la série, un compte à rebours sobre et l'inscription à
 *     l'accès anticipé ; les pièces ne sont pas encore en boutique.
 *  2. Accès anticipé : quelques heures avant le public, seules les inscrites (lien personnel reçu par
 *     e-mail) peuvent acheter.
 *  3. Ouverture : les pièces rejoignent la boutique.
 * Une série peut aussi être une « vente privée » : réservée, jusqu'à son ouverture, aux personnes qui
 * ont le mot de passe (transmis par la maison).
 *
 * Les règles d'accès sont appliquées côté serveur (panier, commande) ; la boutique ne montre les pièces
 * qu'à l'ouverture. Stockage : configuration dans le stockage technique ; inscriptions dans la base
 * clientes (table drop_signups) si elle est configurée, sinon dans le stockage technique.
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { kv } from "@/lib/store";
import { sign, verify } from "@/lib/auth/session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import type { Product } from "@/lib/commerce/types";

export interface Drop {
  slug: string;
  title: string;
  teaser: string;
  image?: string;
  products: string[];
  /** ouverture aux inscrites (ISO) */
  earlyAccessAt: string;
  /** ouverture à toutes (ISO) */
  publicAt: string;
  /** vente privée : jusqu'à l'ouverture, réservée aux détentrices du mot de passe */
  privateSale: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: string;
}

export type DropPhase = "bientot" | "anticipe" | "ouvert";
export type DropAccess = "anticipe" | "prive";

const KEY = "drops";
const COOKIE = "awrea_drops";
const ACCESS_DAYS = 30;

const now = () => Date.now();
export function dropPhase(d: Drop, at = now()): DropPhase {
  if (at >= Date.parse(d.publicAt)) return "ouvert";
  if (at >= Date.parse(d.earlyAccessAt)) return "anticipe";
  return "bientot";
}

// ------------------------------------------------------------------ configuration
export async function listDrops(): Promise<Drop[]> {
  const all = (await kv.get<Drop[]>(KEY)) ?? [];
  return all.sort((a, b) => a.publicAt.localeCompare(b.publicAt));
}

export async function getDrop(slug: string): Promise<Drop | null> {
  return (await listDrops()).find((d) => d.slug === slug) ?? null;
}

/** Le prochain drop pas encore ouvert à toutes (celui de la page « Bientôt »). */
export async function nextDrop(): Promise<Drop | null> {
  return (await listDrops()).find((d) => dropPhase(d) !== "ouvert") ?? null;
}

const hashPassword = (password: string, salt: string) => createHash("sha256").update(`drop:${salt}:${password.normalize("NFC")}`).digest("hex");

export async function saveDrop(input: Omit<Drop, "createdAt" | "passwordHash" | "passwordSalt"> & { password?: string | null }): Promise<Drop> {
  const all = (await kv.get<Drop[]>(KEY)) ?? [];
  const previous = all.find((d) => d.slug === input.slug);
  const { password, ...rest } = input;
  const drop: Drop = { ...previous, ...rest, createdAt: previous?.createdAt ?? new Date().toISOString() };
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

// ------------------------------------------------------------------ inscriptions
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

// ------------------------------------------------------------------ accès
/** Lien personnel envoyé à l'inscrite : ouvre l'accès anticipé dans son navigateur. */
export function accessLinkToken(slug: string, email: string): string {
  return sign({ d: slug, e: createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16) }, ACCESS_DAYS * 86_400);
}
export function verifyAccessLinkToken(token: string | null | undefined): { d: string } | null {
  return verify<{ d: string; e: string }>(token);
}

type AccessCookie = Record<string, DropAccess>;

export async function readDropAccess(): Promise<AccessCookie> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return verify<{ a: AccessCookie }>(raw)?.a ?? {};
}

/** Accorde un accès (lien de l'e-mail ou mot de passe de la vente privée) : cookie signé, 30 jours. */
export async function grantDropAccess(slug: string, kind: DropAccess) {
  const jar = await cookies();
  const current = await readDropAccess();
  const next: AccessCookie = { ...current, [slug]: current[slug] === "prive" ? "prive" : kind };
  jar.set(COOKIE, sign({ a: next }, ACCESS_DAYS * 86_400), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ACCESS_DAYS * 86_400 });
}

/** Le drop (pas encore ouvert à toutes) auquel appartient une pièce. */
export async function dropOfProduct(handle: string, drops?: Drop[]): Promise<Drop | null> {
  const list = drops ?? (await listDrops());
  return list.find((d) => d.products.includes(handle) && dropPhase(d) !== "ouvert") ?? null;
}

/** La visiteuse peut-elle acheter cette pièce maintenant ? Sinon, pourquoi. */
export function canBuy(d: Drop | null, access: AccessCookie, at = now()): { ok: true } | { ok: false; drop: Drop; reason: string } {
  if (!d) return { ok: true };
  const phase = dropPhase(d, at);
  if (phase === "ouvert") return { ok: true };
  const mine = access[d.slug];
  if (d.privateSale && mine === "prive") return { ok: true };
  if (phase === "anticipe" && !d.privateSale && mine) return { ok: true };
  const when = new Date(phase === "bientot" && !d.privateSale ? d.earlyAccessAt : d.publicAt);
  const date = when.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const reason = d.privateSale
    ? `${d.title} est réservée à la vente privée jusqu’au ${date}.`
    : phase === "bientot"
      ? `${d.title} ouvrira aux inscrites le ${date}.`
      : `${d.title} est réservée aux inscrites jusqu’au ${date}.`;
  return { ok: false, drop: d, reason };
}

/** Pièces visibles en boutique : sans les pièces d'un drop pas encore ouvert. */
export async function hideUpcoming<T extends Pick<Product, "handle">>(products: T[]): Promise<T[]> {
  const drops = await listDrops();
  const hidden = new Set(drops.filter((d) => dropPhase(d) !== "ouvert").flatMap((d) => d.products));
  return hidden.size ? products.filter((p) => !hidden.has(p.handle)) : products;
}

/** Vérification côté serveur avant d'ajouter au panier ou de payer. */
export async function assertCanBuy(handles: string[]): Promise<string | null> {
  const drops = await listDrops();
  if (!drops.length) return null;
  const access = await readDropAccess();
  for (const h of new Set(handles)) {
    const r = canBuy(await dropOfProduct(h, drops), access);
    if (!r.ok) return r.reason;
  }
  return null;
}
