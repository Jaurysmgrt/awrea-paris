/**
 * E-mails modifiables sans code : chaque e-mail est un document de contenu (« email-… ») fait de
 * blocs, avec brouillon, publication programmée et historique comme une page. Les textes communs
 * (devise, pied de page, désinscription) vivent dans le document « email-commun ».
 */
import "server-only";
import { identity } from "@/content/brand/identity";
import { siteUrl } from "@/lib/seo/metadata";
import { atelierHref } from "@/lib/admin/path";
import { formatPrice } from "@/lib/format";
import { getProductsByHandles } from "@/lib/commerce";
import { listDocuments } from "@/lib/edition/documents";
import { readDoc } from "@/lib/edition/store";
import type { Locale } from "@/lib/edition/config";
import { sendEmail } from "@/lib/email/send";
import { unsubscribeHeaders, unsubscribePage } from "@/lib/marketing/unsubscribe";
import type { EmailDoc } from "@/lib/email/blocks";
import { renderEmail, type EmailCommon, type EmailContext, type RenderedEmail } from "@/lib/email/render";

export const COMMON_DOC = "email-commun";

/** E-mail publié (ou son brouillon, pour l'aperçu de l'éditeur). */
export async function emailDoc(id: string, locale: Locale = "fr", draft = false): Promise<EmailDoc | null> {
  const doc = (await readDoc(id, locale, { draft })) ?? (locale !== "fr" ? await readDoc(id, "fr", { draft }) : null);
  return (doc as EmailDoc | null) ?? null;
}

export async function emailCommon(locale: Locale = "fr", draft = false): Promise<EmailCommon> {
  const c = (await readDoc(COMMON_DOC, locale, { draft })) as Partial<EmailCommon> | null;
  return { devise: identity.tagline.replace(/\.$/, ""), lignePied: "", desinscription: "", mentions: "", voirPiece: "", total: "", ...(c ?? {}) };
}

export async function emailIds(): Promise<{ id: string; label: string }[]> {
  return (await listDocuments()).filter((d) => d.kind === "email" && d.id !== COMMON_DOC).map((d) => ({ id: d.id, label: d.label }));
}

/** Pièces présentées dans les blocs « Pièce » d'un e-mail. */
async function productsOf(doc: EmailDoc): Promise<EmailContext["products"]> {
  const handles = doc.blocs.flatMap((b) => (b.type === "produit" && Array.isArray(b.pieces) ? (b.pieces as string[]) : []));
  if (!handles.length) return {};
  const list = await getProductsByHandles(handles, { includeUpcoming: true }).catch(() => []);
  return Object.fromEntries(list.map((p) => [p.handle, { title: p.title, price: formatPrice(p.price), image: p.images[0]?.src, alt: p.images[0]?.alt, href: `/boutique/${p.handle}` }]));
}

export type EmailRenderOptions = Omit<EmailContext, "site" | "commun" | "products" | "atelierHref" | "instagram"> & { locale?: Locale; draft?: boolean };

export async function renderEmailDoc(id: string, opts: EmailRenderOptions = {}): Promise<RenderedEmail | null> {
  const { locale = "fr", draft = false, ...ctx } = opts;
  const doc = await emailDoc(id, locale, draft);
  if (!doc) return null;
  const [commun, products] = await Promise.all([emailCommon(locale, draft), productsOf(doc)]);
  return renderEmail(doc, { ...ctx, site: siteUrl, commun, products, instagram: identity.social.instagram, atelierHref });
}

/** Envoie l'e-mail publié « id » (repères remplacés par vars). Sans document, rien ne part. */
export async function sendDocEmail(id: string, to: string, opts: EmailRenderOptions & { tag?: string; replyTo?: string; attachments?: Parameters<typeof sendEmail>[0]["attachments"] } = {}) {
  const { tag, replyTo, attachments, ...render } = opts;
  const doc = await emailDoc(id, render.locale ?? "fr", render.draft);
  if (!doc) throw new Error(`E-mail introuvable : ${id}`);
  // une lettre porte toujours son lien de désinscription, et l'en-tête qui l'offre en un clic
  const lettre = doc.famille === "lettre";
  const mail = await renderEmailDoc(id, { ...render, unsubscribe: lettre ? unsubscribePage(to) : undefined });
  if (!mail) throw new Error(`E-mail introuvable : ${id}`);
  return sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, tag: tag ?? id, replyTo, attachments, headers: lettre ? unsubscribeHeaders(to) : undefined });
}
