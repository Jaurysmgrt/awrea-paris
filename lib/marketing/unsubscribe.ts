/**
 * Désinscription des lettres (obligation de la loi pour la confiance dans l'économie numérique) :
 * chaque lettre porte un lien signé, valable un an, et l'en-tête « List-Unsubscribe » qui permet
 * aux messageries de proposer la désinscription en un clic (RFC 8058). Le lien ouvre une page qui
 * demande une confirmation : un robot qui suit les liens d'un e-mail ne désinscrit personne.
 */
import "server-only";
import { kv } from "@/lib/store";
import { sign, verify } from "@/lib/auth/session";
import { siteUrl } from "@/lib/seo/metadata";
import { unsubscribeContact } from "@/lib/marketing/provider";
import { unsubscribeNewsletter } from "@/lib/shopify/admin";

const YEAR = 60 * 60 * 24 * 365;

export const unsubscribeToken = (email: string) => sign({ e: email.toLowerCase(), k: "desinscription" }, YEAR);

export function emailOfToken(token: string | null | undefined): string | null {
  const data = verify<{ e: string; k: string }>(token);
  return data?.k === "desinscription" ? data.e : null;
}

export const unsubscribePage = (email: string) => `${siteUrl}/lettres/desinscription?jeton=${encodeURIComponent(unsubscribeToken(email))}`;

/** En-têtes d'une lettre : désinscription en un clic depuis la messagerie. */
export const unsubscribeHeaders = (email: string): Record<string, string> => ({
  "List-Unsubscribe": `<${siteUrl}/api/newsletter/desinscription?jeton=${encodeURIComponent(unsubscribeToken(email))}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

export async function unsubscribe(email: string): Promise<void> {
  const list = (await kv.get<{ email: string }[]>("newsletter:subscribers")) ?? [];
  await kv.set("newsletter:subscribers", list.filter((s) => s.email.toLowerCase() !== email.toLowerCase()));
  await kv.push("newsletter:desinscriptions", { email, date: new Date().toISOString() }, 2000);
  await Promise.all([unsubscribeContact(email).catch((e) => console.error("[désinscription] e-mails", e)), unsubscribeNewsletter(email).catch((e) => console.error("[désinscription] Shopify", e))]);
}
