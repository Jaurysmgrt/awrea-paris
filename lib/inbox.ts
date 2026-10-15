/** Boîte de réception unique : formulaires, assistante, e-mails, Instagram (traitée par l'agent Service client). */
import { kv } from "@/lib/store";

export interface InboxMessage {
  id: string;
  date: string;
  channel: "contact" | "rendez-vous" | "assistant" | "email" | "instagram";
  name: string;
  email: string;
  subject: string;
  message: string;
  orderNumber?: string;
  appointment?: { type: string; preferredDate?: string; slot?: string };
  status: "new" | "drafted" | "answered" | "escalated";
  draft?: { body: string; agentNote?: string; date: string; sensitive: boolean };
  answer?: { body: string; date: string; by: "agent" | "atelier" };
}

export const INBOX_KEY = "inbox";

export async function listInbox(limit = 200): Promise<InboxMessage[]> {
  return kv.list<InboxMessage>(INBOX_KEY, limit);
}

export async function addInbox(msg: InboxMessage) {
  await kv.push(INBOX_KEY, msg, 2000);
}

/** Met à jour un message (liste réécrite : volumes faibles, opération rare). */
export async function updateInbox(id: string, patch: Partial<InboxMessage>) {
  const all = await kv.list<InboxMessage>(INBOX_KEY, 2000);
  const next = all.map((m) => (m.id === id ? { ...m, ...patch } : m));
  await kv.del(INBOX_KEY);
  for (const m of next.reverse()) await kv.push(INBOX_KEY, m, 2000);
}
