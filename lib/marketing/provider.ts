/**
 * Outil d'e-mails marketing : Brevo (par défaut, société française, données dans l'UE)
 * ou Klaviyo. Les gabarits restent ceux du site (lib/email/templates.ts) pour garder
 * la même direction artistique partout.
 *  - Brevo : contacts et listes synchronisés, e-mails envoyés par l'API transactionnelle.
 *  - Klaviyo : profils et évènements envoyés ; les scénarios peuvent aussi être bâtis dans Klaviyo.
 *  - Aucun : e-mails transmis à l'outil transactionnel du site (Resend) ou à la boîte d'envoi simulée.
 */
import "server-only";
import { identity } from "@/content/brand/identity";
import { sendEmail, type OutgoingEmail } from "@/lib/email/send";
import { kv } from "@/lib/store";
import { providerOf } from "@/lib/config/providers";

export type MarketingProvider = "brevo" | "klaviyo" | "none";
/** Interrupteur MARKETING_PROVIDER (lib/config/providers.ts) ; « none » = simulation. */
const chosen = providerOf("marketing");
export const marketingProvider: MarketingProvider = chosen === "mock" ? "none" : chosen;

export interface ContactAttributes {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  locale?: string;
  marketing: boolean;
  segment?: string;
  cercle?: boolean;
  birthday?: string | null;
}

/** Crée ou met à jour le contact (avec son consentement) dans l'outil d'e-mails. */
export async function upsertContact(c: ContactAttributes): Promise<void> {
  if (marketingProvider === "brevo") {
    const listId = Number(process.env.BREVO_LIST_ID ?? 0);
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email: c.email,
        updateEnabled: true,
        emailBlacklisted: !c.marketing,
        attributes: { PRENOM: c.firstName ?? "", NOM: c.lastName ?? "", LANGUE: c.locale ?? "fr", SEGMENT: c.segment ?? "", CERCLE: Boolean(c.cercle), ANNIVERSAIRE: c.birthday ?? "" },
        listIds: c.marketing && listId ? [listId] : undefined,
      }),
    });
    if (!res.ok && res.status !== 204) throw new Error(`Brevo contacts : ${res.status}`);
    return;
  }
  if (marketingProvider === "klaviyo") {
    await klaviyo("profile-import", {
      data: {
        type: "profile",
        attributes: { email: c.email, first_name: c.firstName ?? undefined, last_name: c.lastName ?? undefined, locale: c.locale, properties: { segment: c.segment, cercle: c.cercle, birthday: c.birthday } },
      },
    });
    if (c.marketing && process.env.KLAVIYO_LIST_ID) {
      await klaviyo("profile-subscription-bulk-create-jobs", {
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: { profiles: { data: [{ type: "profile", attributes: { email: c.email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } }] } },
          relationships: { list: { data: { type: "list", id: process.env.KLAVIYO_LIST_ID } } },
        },
      });
    }
  }
}

/** Évènement (Klaviyo) : permet aussi de construire des scénarios directement dans Klaviyo. */
export async function trackEvent(email: string, name: string, properties: Record<string, unknown> = {}) {
  if (marketingProvider !== "klaviyo") return;
  await klaviyo("events", {
    data: {
      type: "event",
      attributes: { properties, metric: { data: { type: "metric", attributes: { name } } }, profile: { data: { type: "profile", attributes: { email } } } },
    },
  });
}

async function klaviyo(path: string, body: unknown) {
  const res = await fetch(`https://a.klaviyo.com/api/${path}/`, {
    method: "POST",
    headers: { Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`, revision: "2025-07-15", "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 202 && res.status !== 204) throw new Error(`Klaviyo ${path} : ${res.status}`);
}

/** Envoi d'un e-mail de scénario, au gabarit de la maison. */
export async function sendFlowEmail(mail: OutgoingEmail & { flow: string }): Promise<void> {
  const record = { to: mail.to, subject: mail.subject, flow: mail.flow, date: new Date().toISOString() };
  if (marketingProvider === "brevo") {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: identity.name, email: process.env.BREVO_SENDER_EMAIL ?? identity.email },
        to: [{ email: mail.to }],
        subject: mail.subject,
        htmlContent: mail.html,
        textContent: mail.text,
        tags: [mail.flow],
        replyTo: mail.replyTo ? { email: mail.replyTo } : undefined,
      }),
    });
    await kv.push("marketing:sent", { ...record, provider: "brevo", ok: res.ok }, 500);
    if (!res.ok) throw new Error(`Brevo envoi : ${res.status}`);
    return;
  }
  await sendEmail({ ...mail, tag: mail.flow });
  await kv.push("marketing:sent", { ...record, provider: marketingProvider === "klaviyo" ? "site (Klaviyo pour les évènements)" : "site" }, 500);
}
