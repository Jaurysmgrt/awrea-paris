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
}

export async function sendEmail(mail: OutgoingEmail): Promise<{ id: string; delivered: boolean }> {
  const key = providerOf("email") === "resend" ? process.env.RESEND_API_KEY : undefined;
  const from = process.env.EMAIL_FROM ?? `${identity.name} <${identity.email}>`;
  const record = { ...mail, from, date: new Date().toISOString() };
  if (!key) {
    const id = `outbox-${Date.now()}`;
    await kv.push("email:outbox", { id, ...record, delivered: false }, 300);
    console.info(`[email] (simulation) → ${mail.to} : ${mail.subject}`);
    return { id, delivered: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text, reply_to: mail.replyTo, tags: mail.tag ? [{ name: "type", value: mail.tag }] : undefined }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  await kv.push("email:outbox", { id: json.id ?? "", ...record, delivered: res.ok }, 300);
  if (!res.ok) throw new Error(`Resend : ${res.status}`);
  return { id: json.id ?? "", delivered: true };
}
