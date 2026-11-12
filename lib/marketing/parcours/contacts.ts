/**
 * Adaptateur des contacts des parcours : la seule porte par laquelle les parcours lisent les
 * personnes, leurs segments, leurs commandes, leur panier et leur désinscription. Lecture seule,
 * sur les fonctions et le stockage existants :
 *  - inscrites à la lettre (stockage « newsletter:subscribers », app/api/newsletter) ;
 *  - désinscriptions (stockage « newsletter:desinscriptions », lib/marketing/unsubscribe.ts) ;
 *  - fiches clientes et leur accord aux lettres (lib/customers : listCustomerStats) ;
 *  - commandes payées (lib/commerce/orders) ;
 *  - signes d'intérêt : avant-premières (lib/drops) et rendez-vous de conseil (lib/appointments) ;
 *  - paniers non finalisés des clientes connectées qui ont accepté la personnalisation ;
 *  - e-mails marketing déjà partis hors des parcours (lettre, avant-première, relance du panier).
 *
 * Quand la fiche contact unique (étape 5 : inscrites et clientes réunies, statut abonnée, non
 * abonnée ou désinscrite) sera là, seul ce fichier changera : `peutRecevoirMarketing` et
 * `lireContacts` liront ce statut au lieu de le recalculer.
 *
 * Une source illisible fait échouer la lecture entière : un passage sans données sûres ne fait
 * rien (jamais une sortie ni une entrée sur une donnée manquante).
 */
import "server-only";
import { kv } from "@/lib/store";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { listCustomerStats } from "@/lib/customers";
import { segmentOf } from "@/lib/customers/segments";
import { getOrders } from "@/lib/commerce/orders";
import { isSale } from "@/lib/admin/dashboard";
import { dropSignups, listDrops } from "@/lib/drops";
import { listAppointments } from "@/lib/appointments";
import { envoisLettre } from "@/lib/email/lettre";
import type { Contact } from "./types";

/** E-mails automatiques qui comptent dans le plafond (marketing), parmi ceux de lib/marketing/flows.ts. */
const FLUX_MARKETING = new Set(["bienvenue", "avant-premiere", "panier"]);

const cle = (email: string) => email.trim().toLowerCase();
const iso = (d: string | null | undefined): string | null => {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
const plusTot = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);
const plusTard = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

type Inscription = { email: string; date?: string; prenom?: string };
type Panier = { email: string; le: string };

/** Paniers non finalisés : seulement ceux des clientes connectées qui ont accepté la personnalisation. */
async function paniers(comptes: Map<string, string>): Promise<Panier[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseAdmin().from("carts").select("updated_at, lines, customers!inner(email, personalization)").limit(5000);
    if (error) throw new Error(`paniers : ${error.message}`);
    return ((data ?? []) as unknown as { updated_at: string; lines: unknown[] | null; customers: { email: string; personalization: boolean } }[])
      .filter((c) => c.customers.personalization && c.lines?.length)
      .map((c) => ({ email: cle(c.customers.email), le: c.updated_at }));
  }
  // démonstration : le panier enregistré avec la fiche (lib/customers, saveCartSnapshot)
  const out: Panier[] = [];
  for (const [id, email] of comptes) {
    const p = await kv.get<{ lines?: unknown[]; updatedAt?: string }>(`cust:${id}:cart`);
    if (p?.lines?.length && p.updatedAt) out.push({ email, le: p.updatedAt });
  }
  return out;
}

/** Identifiants des clientes qui ont un compte (en démonstration, la liste est tenue par lib/customers). */
async function idsDesComptes(): Promise<Set<string> | null> {
  if (isSupabaseConfigured) return null; // chaque fiche de la base est un compte
  return new Set((await kv.get<string[]>("customers:index")) ?? []);
}

export async function lireContacts(): Promise<Contact[]> {
  const [inscrites, desinscriptions, stats, commandes, drops, rendezVous, partis, lettres, comptesDemo] = await Promise.all([
    kv.get<Inscription[]>("newsletter:subscribers").then((l) => l ?? []),
    kv.list<{ email: string; date: string }>("newsletter:desinscriptions", 2000),
    listCustomerStats(),
    getOrders(),
    listDrops().then((l) => Promise.all(l.map((d) => dropSignups(d.slug)))),
    listAppointments(),
    kv.list<{ to: string; flow: string; date: string }>("marketing:sent", 500),
    envoisLettre(),
    idsDesComptes(),
  ]);

  const desinscriteLe = new Map<string, string>();
  for (const d of desinscriptions) {
    const e = cle(d.email);
    desinscriteLe.set(e, plusTard(desinscriteLe.get(e) ?? null, iso(d.date)) ?? "");
  }

  const contacts = new Map<string, Contact>();
  const contact = (email: string): Contact => {
    const e = cle(email);
    let c = contacts.get(e);
    if (!c) {
      c = { email: e, prenom: null, marketing: false, inscriteLe: null, compte: false, cercle: false, segment: "nouvelle", commandes: [], interetLe: null, panierLe: null, dernierMarketing: null };
      contacts.set(e, c);
    }
    return c;
  };

  // inscrites à la lettre : l'inscription vaut accord, sauf désinscription plus récente
  for (const s of inscrites) {
    if (!s.email?.includes("@")) continue;
    const c = contact(s.email);
    const le = iso(s.date);
    const desinscrite = desinscriteLe.get(c.email);
    c.inscriteLe = plusTot(c.inscriteLe, le);
    c.prenom ??= s.prenom?.trim().split(/\s+/)[0] || null;
    if (!desinscrite || (le && le > desinscrite)) c.marketing = true;
  }

  // fiches clientes : compte, Cercle, segment, accord donné dans le compte
  const comptes = new Map<string, string>();
  for (const s of stats) {
    if (!s.email?.includes("@")) continue;
    const c = contact(s.email);
    const estCompte = comptesDemo ? comptesDemo.has(s.id) : true;
    if (estCompte) {
      c.compte = true;
      comptes.set(s.id, c.email);
    }
    c.cercle = s.cercleMember;
    c.prenom ??= s.firstName?.trim().split(/\s+/)[0] || null;
    if (s.marketingEmail && estCompte) {
      // une désinscription par le lien de la lettre l'emporte sur l'accord du compte (dont la date n'est pas connue)
      if (!desinscriteLe.has(c.email)) c.marketing = true;
      c.inscriteLe ??= iso(s.createdAt);
    }
  }

  // commandes payées (ventes seulement), de la plus ancienne à la plus récente
  const ventes = new Map<string, { n: number; total: number }>();
  for (const o of commandes) {
    if (!isSale(o) || !o.email?.includes("@")) continue;
    const c = contact(o.email);
    const le = iso(o.createdAt);
    if (le) c.commandes.push(le);
    const v = ventes.get(c.email) ?? { n: 0, total: 0 };
    ventes.set(c.email, { n: v.n + 1, total: v.total + o.total });
  }
  for (const c of contacts.values()) {
    c.commandes.sort();
    const v = ventes.get(c.email);
    c.segment = segmentOf(v?.n ?? 0, v?.total ?? 0);
  }

  // signes d'intérêt : avant-premières et rendez-vous (pour qui a déjà donné son accord)
  for (const liste of drops) for (const s of liste) if (contacts.has(cle(s.email))) contact(s.email).interetLe = plusTot(contact(s.email).interetLe, iso(s.date));
  for (const r of rendezVous) if (r.status === "confirme" && contacts.has(cle(r.email))) contact(r.email).interetLe = plusTot(contact(r.email).interetLe, iso(r.createdAt));

  for (const p of await paniers(comptes)) if (contacts.has(p.email)) contact(p.email).panierLe = plusTard(contact(p.email).panierLe, iso(p.le));

  // e-mails marketing partis hors des parcours : comptent dans le plafond
  for (const m of partis) if (FLUX_MARKETING.has(m.flow) && contacts.has(cle(m.to))) contact(m.to).dernierMarketing = plusTard(contact(m.to).dernierMarketing, iso(m.date));
  const lettre = lettres.filter((l) => l.nombre > 0).map((l) => iso(l.at)).reduce<string | null>((a, b) => plusTard(a, b), null);
  if (lettre) for (const c of contacts.values()) if (c.marketing && (!c.inscriteLe || c.inscriteLe < lettre)) c.dernierMarketing = plusTard(c.dernierMarketing, lettre);

  return [...contacts.values()];
}

/** Cette adresse peut-elle recevoir un e-mail marketing ? (consentement donné, pas de désinscription depuis) */
export async function peutRecevoirMarketing(email: string): Promise<boolean> {
  const e = cle(email);
  return (await lireContacts()).some((c) => c.email === e && c.marketing);
}
