/**
 * Avis clientes vérifiés.
 *
 * - Après achat uniquement : on ne peut donner son avis que par le lien personnel reçu après la
 *   livraison (jeton signé : numéro de commande et empreinte de l'e-mail) ; chaque pièce de la
 *   commande reçoit au plus un avis.
 * - Publication après relecture de l'atelier (tableau de bord « Avis ») ; prénom seulement.
 * - Photos facultatives (trois au plus), recompressées dans le navigateur : les métadonnées
 *   (lieu, appareil) disparaissent avant l'envoi.
 * - Affichage sobre, sans étoiles : un texte, la taille portée, le tombé ressenti.
 *
 * Stockage : base clientes (table reviews, supabase/migrations) si elle est configurée, sinon le
 * stockage technique.
 */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { kv } from "@/lib/store";
import { sign, verify } from "@/lib/auth/session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { getOrder } from "@/lib/commerce/orders";
import type { Order } from "@/lib/commerce/types";

export type Fit = "petite" | "juste" | "grande";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  productHandle: string;
  orderNumber: string;
  authorName: string;
  /** stockage technique seulement (la base clientes relie l'avis à la commande et au compte) */
  emailHash?: string;
  body: string;
  size?: string;
  fit?: Fit;
  /** identifiants des photos (servies par /api/media/<id>) */
  photos: string[];
  status: ReviewStatus;
  /** réponse publique de la créatrice */
  reply?: string;
  createdAt: string;
  moderatedAt?: string;
}

/** Ce que voit une visiteuse : jamais l'e-mail ni la commande. */
export type PublicReview = Pick<Review, "id" | "authorName" | "body" | "size" | "fit" | "photos" | "reply" | "createdAt">;

export const fitLabel: Record<Fit, string> = { juste: "Tombé juste", petite: "Taille un peu petite", grande: "Taille un peu grande" };

const KEY = "reviews";
const emailHash = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

// ------------------------------------------------------------------ lien personnel
/** Lien de la demande d'avis : valable 60 jours. */
export function reviewToken(order: Pick<Order, "number" | "email">): string {
  return sign({ n: order.number, e: emailHash(order.email).slice(0, 16) }, 60 * 86_400);
}

/** La commande que ce lien autorise à commenter (null si le lien est faux ou expiré). */
export async function orderFromReviewToken(number: string, token: string | null | undefined): Promise<Order | null> {
  const t = verify<{ n: string; e: string }>(token);
  if (!t || t.n.toUpperCase() !== number.toUpperCase()) return null;
  const order = await getOrder(t.n);
  if (!order || emailHash(order.email).slice(0, 16) !== t.e) return null;
  return order;
}

// ------------------------------------------------------------------ stockage
type Row = {
  id: string; customer_id: string | null; order_id: string | null; product_handle: string; author_name: string; body: string; fit: Fit | null; size: string | null;
  photos: string[] | null; status: ReviewStatus; moderation_note: string | null; reply: string | null; created_at: string; moderated_at: string | null;
  orders?: { number: string } | null;
};
const fromRow = (r: Row): Review => ({
  id: r.id, productHandle: r.product_handle, orderNumber: r.orders?.number ?? "", authorName: r.author_name, body: r.body, size: r.size ?? undefined, fit: r.fit ?? undefined,
  photos: r.photos ?? [], status: r.status, reply: r.reply ?? undefined, createdAt: r.created_at, moderatedAt: r.moderated_at ?? undefined,
});
const SELECT = "*, orders(number)";

async function all(): Promise<Review[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("reviews").select(SELECT).order("created_at", { ascending: false }).limit(1000);
    return ((data ?? []) as Row[]).map(fromRow);
  }
  return ((await kv.get<Review[]>(KEY)) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const toPublic = (r: Review): PublicReview => ({ id: r.id, authorName: r.authorName, body: r.body, size: r.size, fit: r.fit, photos: r.photos, reply: r.reply, createdAt: r.createdAt });

/** Avis publiés d'une pièce, du plus récent au plus ancien. */
export async function publishedReviews(handle: string): Promise<PublicReview[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("reviews").select(SELECT).eq("product_handle", handle).eq("status", "approved").order("created_at", { ascending: false });
    return ((data ?? []) as Row[]).map(fromRow).map(toPublic);
  }
  return (await all()).filter((r) => r.productHandle === handle && r.status === "approved").map(toPublic);
}

export async function listReviews(status?: ReviewStatus): Promise<Review[]> {
  const list = await all();
  return status ? list.filter((r) => r.status === status) : list;
}

/** Pièces de la commande qui attendent encore un avis. */
export async function reviewablePieces(order: Order): Promise<Order["lines"]> {
  const done = new Set((await all()).filter((r) => r.orderNumber === order.number).map((r) => r.productHandle));
  const seen = new Set<string>();
  return order.lines.filter((l) => {
    if (!l.handle || done.has(l.handle) || seen.has(l.handle)) return false;
    seen.add(l.handle);
    return true;
  });
}

export async function submitReview(order: Order, input: { handle: string; body: string; fit?: Fit; photos: string[] }): Promise<"ok" | "deja" | "inconnue"> {
  const line = order.lines.find((l) => l.handle === input.handle);
  if (!line) return "inconnue";
  if ((await all()).some((r) => r.orderNumber === order.number && r.productHandle === input.handle)) return "deja";
  // prénom et initiale seulement
  const [first, last] = order.name.split(" ");
  const authorName = first ? `${first}${last ? ` ${last.charAt(0)}.` : ""}` : "Une cliente";
  const review: Review = {
    id: randomUUID(), productHandle: input.handle, orderNumber: order.number, authorName, emailHash: emailHash(order.email), body: input.body.trim(),
    size: line.size, fit: input.fit, photos: input.photos, status: "pending", createdAt: new Date().toISOString(),
  };
  if (isSupabaseConfigured) {
    const admin = supabaseAdmin();
    const { data: o } = await admin.from("orders").select("id, customer_id").eq("number", order.number).maybeSingle();
    const { error } = await admin.from("reviews").insert({
      id: review.id, customer_id: o?.customer_id ?? null, order_id: o?.id ?? null, product_handle: review.productHandle, author_name: review.authorName,
      body: review.body, fit: review.fit ?? null, size: review.size ?? null, photos: review.photos, status: "pending",
    });
    if (error) return error.code === "23505" ? "deja" : (() => { throw new Error(`avis : ${error.message}`); })();
    return "ok";
  }
  const list = (await kv.get<Review[]>(KEY)) ?? [];
  await kv.set(KEY, [...list, review]);
  return "ok";
}

export async function moderateReview(id: string, status: Exclude<ReviewStatus, "pending">, reply?: string | null): Promise<boolean> {
  const patch = { status, reply: reply?.trim() || null, moderated_at: new Date().toISOString() };
  if (isSupabaseConfigured) {
    const { error, count } = await supabaseAdmin().from("reviews").update(patch, { count: "exact" }).eq("id", id);
    if (error) throw new Error(`avis : ${error.message}`);
    return Boolean(count);
  }
  const list = (await kv.get<Review[]>(KEY)) ?? [];
  const r = list.find((x) => x.id === id);
  if (!r) return false;
  await kv.set(KEY, list.map((x) => (x.id === id ? { ...x, status, reply: patch.reply ?? undefined, moderatedAt: patch.moderated_at } : x)));
  return true;
}

/** Avis d'une cliente (export de ses données). */
export async function reviewsOf(s: { id: string; email: string }): Promise<PublicReview[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("reviews").select(SELECT).eq("customer_id", s.id);
    return ((data ?? []) as Row[]).map(fromRow).map(toPublic);
  }
  const h = emailHash(s.email);
  return ((await kv.get<Review[]>(KEY)) ?? []).filter((r) => r.emailHash === h).map(toPublic);
}

/**
 * Suppression du compte : les avis restent, mais anonymes (« Une cliente »), sans photos ni lien
 * avec la cliente.
 */
export async function anonymizeReviewsOf(s: { id: string; email: string }) {
  if (isSupabaseConfigured) {
    await supabaseAdmin().from("reviews").update({ author_name: "Une cliente", photos: [] }).eq("customer_id", s.id);
    return;
  }
  const h = emailHash(s.email);
  const list = (await kv.get<Review[]>(KEY)) ?? [];
  await kv.set(KEY, list.map((r) => (r.emailHash === h ? { ...r, authorName: "Une cliente", photos: [], emailHash: undefined } : r)));
}
