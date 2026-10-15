/**
 * Envoi d'e-mails transactionnels (hors e-mails de commande, envoyés par Shopify).
 * Pilote Resend (RESEND_API_KEY, interrupteur EMAIL_PROVIDER). Sans clé, les e-mails sont journalisés et conservés
 * dans la boîte « outbox » visible dans le tableau de bord Atelier.
 */
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { providerOf } from "@/lib/config/providers";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tag?: string;
  /** en-têtes supplémentaires (désinscription en un clic des lettres) */
  headers?: Record<string, string>;
  /** pièces jointes (facture PDF, export comptable…) */
  attachments?: { filename: string; content: Uint8Array | string }[];
}

const base64 = (c: Uint8Array | string) => Buffer.from(c).toString("base64");

export async function sendEmail(mail: OutgoingEmail): Promise<{ id: string; delivered: boolean }> {
  const key = providerOf("email") === "resend" ? process.env.RESEND_API_KEY : undefined;
  const from = process.env.EMAIL_FROM ?? `${identity.name} <${identity.email}>`;
  // boîte d'envoi : le nom et la taille des pièces jointes, jamais leur contenu
  const { attachments, ...rest } = mail;
  const record = { ...rest, from, date: new Date().toISOString(), attachments: attachments?.map((a) => ({ filename: a.filename, size: Buffer.from(a.content).length })) };
  if (!key) {
    const id = `outbox-${Date.now()}`;
    await kv.push("email:outbox", { id, ...record, delivered: false }, 300);
    console.info(`[email] (simulation) → ${mail.to} : ${mail.subject}`);
    return { id, delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      reply_to: mail.replyTo,
      headers: mail.headers,
      tags: mail.tag ? [{ name: "type", value: mail.tag }] : undefined,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: base64(a.content) })),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  await kv.push("email:outbox", { id: json.id ?? "", ...record, delivered: res.ok }, 300);
  if (!res.ok) throw new Error(`Resend : ${res.status}`);
  return { id: json.id ?? "", delivered: true };
}
