/**
 * Suivi d'une cliente dans l'Atelier (lot 3) : notes internes (jamais vues par la cliente) et
 * droits RGPD exercés à sa demande. L'effacement retire son compte (profil, adresses, envies,
 * navigation) ; ses commandes restent, détachées du compte, dix ans durant (obligation comptable),
 * comme pour un effacement demandé depuis son compte (lib/customers, deleteAccount).
 */
import "server-only";
import { kv } from "@/lib/store";
import { deleteAccount, exportPourAtelier, profilPourAtelier, statsCliente } from "@/lib/customers";
import { unsubscribe } from "@/lib/marketing/unsubscribe";
import { unsubscribeContact } from "@/lib/marketing/provider";
import { contactParEmail, contactParId, effacerFiche, ficheBrute, type Contact } from "@/lib/crm";
import { getOrders } from "@/lib/commerce/orders";
import { notesDe } from "./commandes-suivi";
import { logAction } from "@/lib/agents/log";
import type { NoteInterne } from "./commandes";

export const NOTE_CLIENTE_MAX = 2000;
const cleNotes = (id: string) => `clientes:notes:${id}`;

export class ClienteError extends Error {}

/** Identifiant d'une cliente : celui de Supabase (uuid) ou de la démonstration. */
export const ID_CLIENTE = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * Une fiche du CRM par son identifiant : cliente avec compte, cliente qui a commandé sans compte,
 * inscrite à la lettre ou personne venue en rendez-vous (lib/crm). Une cliente au-delà des fiches
 * lues d'un coup se retrouve encore par son compte.
 */
export async function trouverCliente(id: string): Promise<Contact | null> {
  if (!ID_CLIENTE.test(id)) return null;
  const contact = await contactParId(id);
  if (contact) return contact;
  const stats = await statsCliente(id);
  return stats ? contactParEmail(stats.email) : null;
}

export async function notesCliente(id: string): Promise<NoteInterne[]> {
  return kv.list<NoteInterne>(cleNotes(id), 200);
}

export async function ajouterNoteCliente(id: string, texte: string, par: string): Promise<NoteInterne> {
  const t = texte.trim();
  if (!t) throw new ClienteError("La note est vide.");
  if (t.length > NOTE_CLIENTE_MAX) throw new ClienteError(`Une note compte ${NOTE_CLIENTE_MAX} caractères au plus.`);
  const note: NoteInterne = { texte: t, par, at: new Date().toISOString() };
  await kv.push(cleNotes(id), note, 200);
  return note;
}

/**
 * Effacement du compte d'une cliente, à sa demande, après que la créatrice a recopié son adresse
 * e-mail : son compte (profil, adresses, envies, navigation), son inscription à la lettre, les notes
 * de l'atelier sur elle et sur ses commandes. Restent ses commandes et leurs factures, détachées du
 * compte, dix ans durant (obligation comptable). Le registre RGPD et le journal ne gardent aucune donnée
 * personnelle de la cliente.
 */
export async function effacerCliente(id: string, emailRecopie: string, par: string): Promise<void> {
  const c = await trouverCliente(id);
  if (!c) throw new ClienteError("Cette cliente n’existe pas.");
  if (emailRecopie.trim().toLowerCase() !== c.email.trim().toLowerCase()) throw new ClienteError("L’adresse recopiée ne correspond pas : rien n’a été effacé.");
  const email = c.email.trim().toLowerCase();
  if (!(await profilPourAtelier(id))) {
    // sans compte : sa fiche de la lettre (inscription, preuve, coordonnées, historique) s'efface seule
    if (c.donneesLettre) {
      await unsubscribeContact(c.email).catch((e) => console.error("[clientes] lettre", e));
      await effacerFiche(email);
      await kv.del(cleNotes(id));
      await kv.push("rgpd:requests", { kind: "effacement d’une fiche sans compte (Atelier)", at: new Date().toISOString() }, 1000);
      await logAction({ agent: "systeme", kind: "rgpd", status: "done", summary: `Par l’atelier (${par}) · fiche d’une personne sans compte effacée à sa demande (commandes gardées)` }).catch(() => {});
      return;
    }
    throw new ClienteError("Cette cliente n’a pas de compte : il n’y a rien à effacer, ses commandes restent pour la comptabilité.");
  }
  const sesCommandes = (await getOrders()).filter((o) => o.email.trim().toLowerCase() === email);
  await deleteAccount({ id, email: c.email });
  await unsubscribe(c.email, { source: "atelier", par }).catch((e) => console.error("[clientes] lettre", e));
  await effacerFiche(email).catch((e) => console.error("[clientes] fiche", e));
  await kv.del(cleNotes(id));
  await Promise.all(sesCommandes.map((o) => kv.del(`commandes:notes:${o.id}`)));
  await kv.push("rgpd:requests", { kind: "effacement (Atelier)", at: new Date().toISOString() }, 1000);
  await logAction({ agent: "systeme", kind: "rgpd", status: "done", summary: `Par l’atelier (${par}) · compte d’une cliente effacé à sa demande (commandes gardées, détachées du compte)` }).catch(() => {});
}

/** Données d'une cliente à lui remettre (droit d'accès), notes de l'atelier comprises. */
export async function donneesCliente(c: { id: string; email: string }) {
  const email = c.email.trim().toLowerCase();
  const sesCommandes = (await getOrders()).filter((o) => o.email.trim().toLowerCase() === email);
  const commandes = Object.fromEntries(await Promise.all(sesCommandes.map(async (o) => [o.number, await notesDe(o.id)] as const)));
  // avec ce que le CRM garde pour son adresse : inscription à la lettre, preuve du consentement, historique
  return { ...(await exportPourAtelier(c, { cliente: await notesCliente(c.id), commandes })), lettre: await ficheBrute(c.email) };
}

