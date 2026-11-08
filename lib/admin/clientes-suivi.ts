/**
 * Suivi d'une cliente dans l'Atelier (lot 3) : notes internes (jamais vues par la cliente) et
 * droits RGPD exercés à sa demande. L'effacement retire son compte (profil, adresses, envies,
 * navigation) ; ses commandes restent, détachées du compte, dix ans durant (obligation comptable),
 * comme pour un effacement demandé depuis son compte (lib/customers, deleteAccount).
 */
import "server-only";
import { kv } from "@/lib/store";
import { deleteAccount, listCustomerStats, profilPourAtelier } from "@/lib/customers";
import { logAction } from "@/lib/agents/log";
import type { NoteInterne } from "./commandes";

export const NOTE_CLIENTE_MAX = 2000;
const cleNotes = (id: string) => `clientes:notes:${id}`;

export class ClienteError extends Error {}

/** Identifiant d'une cliente : celui de Supabase (uuid) ou de la démonstration. */
export const ID_CLIENTE = /^[A-Za-z0-9_-]{6,64}$/;

export async function trouverCliente(id: string) {
  if (!ID_CLIENTE.test(id)) return null;
  return (await listCustomerStats()).find((c) => c.id === id) ?? null;
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
 * e-mail. Le registre RGPD et le journal ne gardent aucune donnée personnelle.
 */
export async function effacerCliente(id: string, emailRecopie: string): Promise<void> {
  const c = await trouverCliente(id);
  if (!c) throw new ClienteError("Cette cliente n’existe pas.");
  if (emailRecopie.trim().toLowerCase() !== c.email.trim().toLowerCase()) throw new ClienteError("L’adresse recopiée ne correspond pas : rien n’a été effacé.");
  if (!(await profilPourAtelier(id))) throw new ClienteError("Cette cliente n’a pas de compte : il n’y a rien à effacer, ses commandes restent pour la comptabilité.");
  await deleteAccount({ id, email: c.email });
  await kv.del(cleNotes(id));
  await kv.push("rgpd:requests", { kind: "effacement (Atelier)", at: new Date().toISOString() }, 1000);
  await logAction({ agent: "systeme", kind: "rgpd", status: "done", summary: "Par l’atelier · compte d’une cliente effacé à sa demande (commandes gardées, détachées du compte)" }).catch(() => {});
}
