/**
 * Base clientes — une seule interface pour tout le site, deux pilotes :
 *  - Supabase (production) : les données d'une cliente sont lues et écrites avec SA session
 *    (sécurité par ligne) ; seules les opérations d'administration utilisent la clé service ;
 *  - démonstration (sans clés) : stockage clé-valeur local, mêmes écrans, mêmes règles.
 */
import { anonymizeReviewsOf, reviewsOf } from "@/lib/reviews";
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { supabaseServer } from "@/lib/db/server";
import { getOrders } from "@/lib/commerce/orders";
import { getWaitlist, WAITLIST_KEY, type WaitlistEntry } from "@/lib/waitlist";
import type { Order, OrderStatus, Size } from "@/lib/commerce/types";
import { segmentOf } from "./segments";
import type { Address, BrowsingEvent, CustomerProfile, CustomerSession, CustomerStats, ProfilePatch, Sizes, WaitlistItem } from "./types";

export * from "./types";
export { segmentOf, segmentLabel } from "./segments";

const SEEN_CAP = 200;

export const demoCustomerId = (email: string) => "d_" + createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);

// ------------------------------------------------------------------ correspondances Supabase
type CustomerRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birthday: string | null;
  locale: "fr" | "en";
  currency: "EUR" | "GBP" | "USD" | "CHF";
  sizes: Sizes | null;
  marketing_email: boolean;
  personalization: boolean;
  cercle_member: boolean;
  cercle_joined_at: string | null;
  vip_since: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  created_at: string;
};

const fromRow = (r: CustomerRow): CustomerProfile => ({
  id: r.id,
  email: r.email,
  firstName: r.first_name,
  lastName: r.last_name,
  phone: r.phone,
  birthday: r.birthday,
  locale: r.locale,
  currency: r.currency,
  sizes: r.sizes ?? {},
  marketingEmail: r.marketing_email,
  personalization: r.personalization,
  cercleMember: r.cercle_member,
  cercleJoinedAt: r.cercle_joined_at,
  vipSince: r.vip_since,
  termsVersion: r.terms_version,
  termsAcceptedAt: r.terms_accepted_at,
  createdAt: r.created_at,
});

function patchToRow(p: ProfilePatch, current?: CustomerProfile | null): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.firstName !== undefined) row.first_name = p.firstName;
  if (p.lastName !== undefined) row.last_name = p.lastName;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.birthday !== undefined) row.birthday = p.birthday;
  if (p.locale !== undefined) row.locale = p.locale;
  if (p.currency !== undefined) row.currency = p.currency;
  if (p.sizes !== undefined) row.sizes = p.sizes;
  if (p.personalization !== undefined) row.personalization = p.personalization;
  if (p.marketingEmail !== undefined) {
    row.marketing_email = p.marketingEmail;
    if (p.marketingEmail && !current?.marketingEmail) row.marketing_email_at = new Date().toISOString();
  }
  if (p.cercleMember !== undefined) {
    row.cercle_member = p.cercleMember;
    row.cercle_joined_at = p.cercleMember ? (current?.cercleJoinedAt ?? new Date().toISOString()) : null;
  }
  return row;
}

type AddressRow = {
  id: string;
  label: string | null;
  first_name: string;
  last_name: string;
  line1: string;
  line2: string | null;
  postal_code: string;
  city: string;
  country: string;
  phone: string | null;
  is_default: boolean;
};
const addressFromRow = (r: AddressRow): Address => ({
  id: r.id,
  label: r.label,
  firstName: r.first_name,
  lastName: r.last_name,
  line1: r.line1,
  line2: r.line2,
  postalCode: r.postal_code,
  city: r.city,
  country: r.country,
  phone: r.phone,
  isDefault: r.is_default,
});

type OrderRow = {
  id: string;
  number: string;
  email: string;
  status: string;
  total: number;
  items: Order["lines"];
  shipping: Order["shipping"];
  customer_name: string | null;
  payment_method: string | null;
  gift: boolean;
  placed_at: string;
};
const orderFromRow = (r: OrderRow): Order => ({
  id: r.id,
  number: r.number,
  createdAt: r.placed_at,
  email: r.email,
  name: r.customer_name ?? "",
  status: r.status as OrderStatus,
  lines: r.items ?? [],
  total: r.total,
  shipping: r.shipping ?? { method: "", price: 0, country: "" },
  paymentMethod: r.payment_method ?? "",
  gift: r.gift ? { wrap: true, message: "" } : undefined,
});

// ------------------------------------------------------------------ profil
const demoKey = (id: string, part?: string) => `cust:${id}${part ? `:${part}` : ""}`;

function blankProfile(s: CustomerSession): CustomerProfile {
  return {
    id: s.id,
    email: s.email,
    firstName: null,
    lastName: null,
    phone: null,
    birthday: null,
    locale: "fr",
    currency: "EUR",
    sizes: {},
    marketingEmail: false,
    personalization: false,
    cercleMember: false,
    cercleJoinedAt: null,
    vipSince: null,
    termsVersion: null,
    termsAcceptedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export async function getProfile(s: CustomerSession): Promise<CustomerProfile | null> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("customers").select("*").eq("id", s.id).maybeSingle<CustomerRow>();
    return data ? fromRow(data) : null;
  }
  return kv.get<CustomerProfile>(demoKey(s.id));
}

/**
 * Profil garanti (créé à la première connexion). Avec Supabase, il est créé par un déclencheur
 * à l'inscription ; `init` complète l'acceptation des CGU et le choix des lettres si besoin.
 */
export async function ensureProfile(s: CustomerSession, init?: { termsVersion?: string; marketingEmail?: boolean }): Promise<CustomerProfile> {
  const existing = await getProfile(s);
  if (isSupabaseConfigured) {
    if (!existing) throw new Error("Profil introuvable : le déclencheur handle_new_user est-il installé ?");
    if (init?.termsVersion && !existing.termsAcceptedAt) await acceptTerms(s, init.termsVersion);
    if (init?.marketingEmail && !existing.marketingEmail) return updateProfile(s, { marketingEmail: true });
    return (await getProfile(s)) ?? existing;
  }
  let p = existing ?? blankProfile(s);
  if (!existing) {
    const index = (await kv.get<string[]>("customers:index")) ?? [];
    if (!index.includes(s.id)) await kv.set("customers:index", [s.id, ...index]);
  }
  if (init?.termsVersion && !p.termsAcceptedAt) p = { ...p, termsVersion: init.termsVersion, termsAcceptedAt: new Date().toISOString() };
  if (init?.marketingEmail) p = { ...p, marketingEmail: true };
  await kv.set(demoKey(s.id), p);
  return p;
}

export async function updateProfile(s: CustomerSession, patch: ProfilePatch): Promise<CustomerProfile> {
  const current = await getProfile(s);
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data, error } = await db.from("customers").update(patchToRow(patch, current)).eq("id", s.id).select("*").single<CustomerRow>();
    if (error || !data) throw new Error(error?.message ?? "Mise à jour impossible");
    return fromRow(data);
  }
  const base = current ?? blankProfile(s);
  const next: CustomerProfile = {
    ...base,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    cercleJoinedAt: patch.cercleMember === undefined ? base.cercleJoinedAt : patch.cercleMember ? (base.cercleJoinedAt ?? new Date().toISOString()) : null,
  };
  await kv.set(demoKey(s.id), next);
  return next;
}

/** CGU acceptées (colonne protégée : écrite par le serveur) */
export async function acceptTerms(s: CustomerSession, version: string) {
  if (isSupabaseConfigured) {
    const { error } = await supabaseAdmin().from("customers").update({ terms_version: version, terms_accepted_at: new Date().toISOString() }).eq("id", s.id);
    if (error) throw new Error(error.message);
    return;
  }
  const p = (await getProfile(s)) ?? blankProfile(s);
  await kv.set(demoKey(s.id), { ...p, termsVersion: version, termsAcceptedAt: new Date().toISOString() });
}

// ------------------------------------------------------------------ adresses
export async function listAddresses(s: CustomerSession): Promise<Address[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
    return (data as AddressRow[] | null)?.map(addressFromRow) ?? [];
  }
  return (await kv.get<Address[]>(demoKey(s.id, "addr"))) ?? [];
}

export async function saveAddress(s: CustomerSession, a: Omit<Address, "id"> & { id?: string }): Promise<Address[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    if (a.isDefault) await db.from("addresses").update({ is_default: false }).eq("customer_id", s.id);
    const row = {
      customer_id: s.id,
      label: a.label,
      first_name: a.firstName,
      last_name: a.lastName,
      line1: a.line1,
      line2: a.line2,
      postal_code: a.postalCode,
      city: a.city,
      country: a.country,
      phone: a.phone,
      is_default: a.isDefault,
    };
    const { error } = a.id ? await db.from("addresses").update(row).eq("id", a.id) : await db.from("addresses").insert(row);
    if (error) throw new Error(error.message);
    return listAddresses(s);
  }
  const list = await listAddresses(s);
  const item: Address = { ...a, id: a.id ?? randomBytes(6).toString("hex") };
  let next = a.id ? list.map((x) => (x.id === a.id ? item : x)) : [...list, item];
  if (item.isDefault) next = next.map((x) => ({ ...x, isDefault: x.id === item.id }));
  await kv.set(demoKey(s.id, "addr"), next);
  return next;
}

export async function deleteAddress(s: CustomerSession, id: string): Promise<Address[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    await db.from("addresses").delete().eq("id", id);
    return listAddresses(s);
  }
  const next = (await listAddresses(s)).filter((a) => a.id !== id);
  await kv.set(demoKey(s.id, "addr"), next);
  return next;
}

// ------------------------------------------------------------------ commandes
export async function listOrders(s: CustomerSession): Promise<Order[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("orders").select("*").order("placed_at", { ascending: false });
    return (data as OrderRow[] | null)?.map(orderFromRow) ?? [];
  }
  const email = s.email.toLowerCase();
  return (await getOrders()).filter((o) => o.email.toLowerCase() === email);
}

// ------------------------------------------------------------------ liste d'envies
export async function getWishlist(s: CustomerSession): Promise<string[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("wishlist_items").select("product_handle").order("added_at", { ascending: false });
    return (data ?? []).map((r: { product_handle: string }) => r.product_handle);
  }
  return (await kv.get<string[]>(demoKey(s.id, "wish"))) ?? [];
}

/** Remplace la liste (fusion à la connexion, ajout, retrait) */
export async function setWishlist(s: CustomerSession, handles: string[]): Promise<string[]> {
  const clean = [...new Set(handles.filter((h) => /^[a-z0-9-]{1,120}$/.test(h)))].slice(0, 200);
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const current = await getWishlist(s);
    const toRemove = current.filter((h) => !clean.includes(h));
    const toAdd = clean.filter((h) => !current.includes(h));
    if (toRemove.length) await db.from("wishlist_items").delete().in("product_handle", toRemove);
    if (toAdd.length) await db.from("wishlist_items").insert(toAdd.map((h) => ({ customer_id: s.id, product_handle: h })));
    return getWishlist(s);
  }
  await kv.set(demoKey(s.id, "wish"), clean);
  return clean;
}

/** Lien de partage secret de la liste d'envies (créé une fois, révocable). */
export async function shareWishlist(s: CustomerSession): Promise<string> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("shared_wishlists").select("token").is("revoked_at", null).limit(1).maybeSingle<{ token: string }>();
    if (data) return data.token;
    const token = randomBytes(12).toString("base64url");
    const { error } = await db.from("shared_wishlists").insert({ token, customer_id: s.id });
    if (error) throw new Error(error.message);
    return token;
  }
  const existing = await kv.get<string>(demoKey(s.id, "share"));
  if (existing) return existing;
  const token = randomBytes(12).toString("base64url");
  await kv.set(demoKey(s.id, "share"), token);
  await kv.set(`wishshare:${token}`, { customerId: s.id, email: s.email });
  return token;
}

export async function revokeWishlistShare(s: CustomerSession) {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    await db.from("shared_wishlists").update({ revoked_at: new Date().toISOString() }).is("revoked_at", null);
    return;
  }
  const token = await kv.get<string>(demoKey(s.id, "share"));
  if (token) await kv.del(`wishshare:${token}`);
  await kv.del(demoKey(s.id, "share"));
}

/** Lecture publique d'une liste partagée : prénom et pièces seulement. */
export async function getSharedWishlist(token: string): Promise<{ firstName: string | null; handles: string[] } | null> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return null;
  if (isSupabaseConfigured) {
    const admin = supabaseAdmin();
    const { data: share } = await admin.from("shared_wishlists").select("customer_id").eq("token", token).is("revoked_at", null).maybeSingle<{ customer_id: string }>();
    if (!share) return null;
    const [{ data: c }, { data: items }] = await Promise.all([
      admin.from("customers").select("first_name").eq("id", share.customer_id).maybeSingle<{ first_name: string | null }>(),
      admin.from("wishlist_items").select("product_handle").eq("customer_id", share.customer_id).order("added_at", { ascending: false }),
    ]);
    return { firstName: c?.first_name ?? null, handles: (items ?? []).map((r: { product_handle: string }) => r.product_handle) };
  }
  const share = await kv.get<{ customerId: string; email: string }>(`wishshare:${token}`);
  if (!share) return null;
  const p = await kv.get<CustomerProfile>(demoKey(share.customerId));
  return { firstName: p?.firstName ?? null, handles: (await kv.get<string[]>(demoKey(share.customerId, "wish"))) ?? [] };
}

// ------------------------------------------------------------------ listes d'attente
export async function listWaitlist(s: CustomerSession): Promise<WaitlistItem[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("waitlist_entries").select("id, product_handle, size, created_at, notified_at").order("created_at", { ascending: false });
    return (data ?? []).map((r: { id: string; product_handle: string; size: string | null; created_at: string; notified_at: string | null }) => ({
      id: r.id,
      handle: r.product_handle,
      size: r.size,
      createdAt: r.created_at,
      notifiedAt: r.notified_at,
    }));
  }
  const email = s.email.toLowerCase();
  return (await getWaitlist())
    .filter((w) => w.email.toLowerCase() === email)
    .map((w) => ({ id: `${w.handle}:${w.size ?? ""}`, handle: w.handle, size: w.size, createdAt: w.date, notifiedAt: w.notifiedAt ?? null }));
}

export async function removeWaitlist(s: CustomerSession, id: string) {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    await db.from("waitlist_entries").delete().eq("id", id);
    return;
  }
  const email = s.email.toLowerCase();
  const list = await getWaitlist();
  await kv.set<WaitlistEntry[]>(
    WAITLIST_KEY,
    list.filter((w) => !(w.email.toLowerCase() === email && `${w.handle}:${w.size ?? ""}` === id)),
  );
}

// ------------------------------------------------------------------ navigation (consentement « personnalisation »)
export async function recordBrowsing(s: CustomerSession, ev: Omit<BrowsingEvent, "at">) {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    // la politique RLS refuse l'insertion si la personnalisation n'est pas acceptée
    await db.from("browsing_events").insert({ customer_id: s.id, kind: ev.kind, product_handle: ev.handle ?? null, collection_handle: ev.collection ?? null });
    return;
  }
  const p = await getProfile(s);
  if (!p?.personalization) return;
  await kv.push(demoKey(s.id, "seen"), { ...ev, at: new Date().toISOString() }, SEEN_CAP);
}

export async function listBrowsing(s: CustomerSession, limit = 60): Promise<BrowsingEvent[]> {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    const { data } = await db.from("browsing_events").select("kind, product_handle, collection_handle, created_at").order("created_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r: { kind: BrowsingEvent["kind"]; product_handle: string | null; collection_handle: string | null; created_at: string }) => ({
      kind: r.kind,
      handle: r.product_handle,
      collection: r.collection_handle,
      at: r.created_at,
    }));
  }
  return kv.list<BrowsingEvent>(demoKey(s.id, "seen"), limit);
}

export async function clearBrowsing(s: CustomerSession) {
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    await Promise.all([db.from("browsing_events").delete().eq("customer_id", s.id), db.from("carts").delete().eq("customer_id", s.id)]);
    return;
  }
  await Promise.all([kv.del(demoKey(s.id, "seen")), kv.del(demoKey(s.id, "cart"))]);
}

/** Panier en cours d'une cliente connectée (relance de panier abandonné, avec consentement). */
export async function saveCartSnapshot(s: CustomerSession, lines: { handle: string; title: string; size: Size; quantity: number; unitPrice: number }[], subtotal: number) {
  const p = await getProfile(s);
  if (!p?.personalization) return;
  if (isSupabaseConfigured) {
    const db = await supabaseServer();
    if (!lines.length) await db.from("carts").delete().eq("customer_id", s.id);
    else await db.from("carts").upsert({ customer_id: s.id, lines, subtotal, updated_at: new Date().toISOString(), reminded_at: null });
    return;
  }
  if (!lines.length) await kv.del(demoKey(s.id, "cart"));
  else await kv.set(demoKey(s.id, "cart"), { lines, subtotal, updatedAt: new Date().toISOString(), remindedAt: null });
}

// ------------------------------------------------------------------ RGPD : export et suppression
export async function exportData(s: CustomerSession) {
  const [profile, addresses, orders, wishlist, waitlist, browsing, reviews] = await Promise.all([
    getProfile(s),
    listAddresses(s),
    listOrders(s),
    getWishlist(s),
    listWaitlist(s),
    listBrowsing(s, SEEN_CAP),
    reviewsOf(s),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    controller: "Awrea Paris",
    profile,
    addresses,
    orders,
    wishlist,
    waitlist,
    browsing,
    reviews,
  };
}

/**
 * Suppression du compte : profil, adresses, envies, listes d'attente, navigation, abonnements.
 * Les commandes sont conservées sans lien avec le compte (obligation comptable de 10 ans),
 * les avis publiés restent anonymes (« Une cliente », sans photos).
 */
export async function deleteAccount(s: CustomerSession) {
  await anonymizeReviewsOf(s);
  if (isSupabaseConfigured) {
    const admin = supabaseAdmin();
    await admin.from("waitlist_entries").delete().eq("customer_id", s.id);
    await admin.from("drop_signups").delete().eq("customer_id", s.id);
    const { error } = await admin.auth.admin.deleteUser(s.id); // cascade sur customers et tables liées
    if (error) throw new Error(error.message);
    return;
  }
  const email = s.email.toLowerCase();
  const shareToken = await kv.get<string>(demoKey(s.id, "share"));
  if (shareToken) await kv.del(`wishshare:${shareToken}`);
  await Promise.all(["", "addr", "wish", "seen", "cart", "share"].map((part) => kv.del(demoKey(s.id, part || undefined))));
  const index = (await kv.get<string[]>("customers:index")) ?? [];
  await kv.set(
    "customers:index",
    index.filter((id) => id !== s.id),
  );
  const list = await getWaitlist();
  await kv.set<WaitlistEntry[]>(
    WAITLIST_KEY,
    list.filter((w) => w.email.toLowerCase() !== email),
  );
}

// ------------------------------------------------------------------ administration (tableau de bord)
export async function listCustomerStats(): Promise<CustomerStats[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin().from("customer_stats").select("*").order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []).map(
      (r: { id: string; email: string; first_name: string | null; last_name: string | null; created_at: string; cercle_member: boolean; marketing_email: boolean; orders_count: number; total_spent: number; last_order_at: string | null }) => ({
        id: r.id,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        createdAt: r.created_at,
        cercleMember: r.cercle_member,
        marketingEmail: r.marketing_email,
        ordersCount: Number(r.orders_count),
        totalSpent: Number(r.total_spent),
        lastOrderAt: r.last_order_at,
        segment: segmentOf(Number(r.orders_count), Number(r.total_spent)),
      }),
    );
  }
  // démonstration : clientes inscrites + clientes ayant commandé
  const [index, orders] = await Promise.all([kv.get<string[]>("customers:index"), getOrders()]);
  const profiles = (await Promise.all((index ?? []).map((id) => kv.get<CustomerProfile>(demoKey(id))))).filter(Boolean) as CustomerProfile[];
  const byEmail = new Map<string, CustomerStats>();
  for (const p of profiles) {
    byEmail.set(p.email.toLowerCase(), {
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      createdAt: p.createdAt,
      cercleMember: p.cercleMember,
      marketingEmail: p.marketingEmail,
      ordersCount: 0,
      totalSpent: 0,
      lastOrderAt: null,
      segment: "nouvelle",
    });
  }
  for (const o of orders) {
    if (o.status === "refunded") continue;
    const key = o.email.toLowerCase();
    const c =
      byEmail.get(key) ??
      ({
        id: demoCustomerId(key),
        email: o.email,
        firstName: o.name.split(" ")[0] ?? null,
        lastName: null,
        createdAt: o.createdAt,
        cercleMember: false,
        marketingEmail: false,
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
        segment: "nouvelle",
      } satisfies CustomerStats);
    c.ordersCount += 1;
    c.totalSpent += o.total;
    if (!c.lastOrderAt || o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
    if (o.createdAt < c.createdAt) c.createdAt = o.createdAt;
    byEmail.set(key, c);
  }
  return [...byEmail.values()].map((c) => ({ ...c, segment: segmentOf(c.ordersCount, c.totalSpent) })).sort((a, b) => b.totalSpent - a.totalSpent);
}

export const customersMode = isSupabaseConfigured ? "supabase" : "demo";

/**
 * Purge quotidienne des données arrivées à échéance (navigation de plus de 13 mois, paniers
 * relancés de plus de 30 jours, preuves de consentement de plus de 25 mois) — tâche planifiée.
 */
export async function purgeExpired(): Promise<Record<string, number> | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabaseAdmin().rpc("purge_expired");
  if (error) throw new Error(`purge_expired : ${error.message}`);
  return data as Record<string, number>;
}
