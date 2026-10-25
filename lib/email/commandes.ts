/**
 * E-mails de suivi d'une commande créée sur demande : un e-mail à la cliente à chaque passage
 * d'étape, « Commande reçue », « En confection », « Prête », « Expédiée ». Leurs textes vivent dans
 * les documents e-mail-commande-… (Atelier › E-mails), modifiables sans code ; la livraison garde
 * l'e-mail d'arrivée des scénarios automatiques (lib/marketing/flows.ts, onOrderDelivered).
 *
 * Un e-mail ne part qu'une fois par commande et par étape, même si l'étape est consignée deux fois
 * (geste de l'Atelier puis webhook Shopify, double clic, appels simultanés).
 */
import "server-only";
import { kv } from "@/lib/store";
import { absolute } from "@/lib/seo/metadata";
import { formatDate, formatPrice } from "@/lib/format";
import { orderLink } from "@/lib/commerce/order-access";
import { trackingUrl } from "@/lib/commerce/orders";
import { delaiText, type CatalogueTexts } from "@/lib/commerce/texts";
import { readDoc } from "@/lib/edition/store";
import { withStage } from "@/lib/store/order-stages";
import { estimatedReady } from "@/lib/customers/order-timeline";
import { certificateCodesOfOrder } from "@/lib/certificates";
import { sendDocEmail } from "@/lib/email/documents";
import type { EmailItem } from "@/lib/email/render";
import type { OutgoingEmail } from "@/lib/email/send";
import { fill } from "@/lib/edition/fill";
import type { Order, OrderStage } from "@/lib/commerce/types";

/** Étapes qui envoient un e-mail de suivi, et le document de chacune. */
export const STAGE_EMAILS = {
  paid: "email-commande-recue",
  in_production: "email-commande-en-confection",
  ready: "email-commande-prete",
  shipped: "email-commande-expediee",
} as const satisfies Partial<Record<OrderStage, string>>;

export type MailedStage = keyof typeof STAGE_EMAILS;

export const isMailedStage = (s: string): s is MailedStage => s in STAGE_EMAILS;

const sentKey = (o: Pick<Order, "id">, stage: MailedStage) => `orders:stage-mail:${o.id}:${stage}`;

/** Prénom de la cliente : le premier mot du nom de la commande. */
const firstName = (o: Pick<Order, "name">) => o.name.trim().split(/\s+/)[0] ?? "";

/** Repères communs aux e-mails de suivi (prénom, commande, délai, fin de confection prévue, liens). */
export async function stageEmailVars(order: Order, stage: MailedStage): Promise<Record<string, string>> {
  const full = await withStage(order);
  const catalogue = (await readDoc("catalogue", "fr").catch(() => null)) as Pick<CatalogueTexts, "delai"> | null;
  const lead = full.leadTime ?? null;
  // la fin de confection prévue n'a de sens qu'avant que la pièce soit prête
  const estimate = stage === "paid" || stage === "in_production" ? estimatedReady(full, lead) : null;
  const url = trackingUrl(full.shipping.carrier, full.shipping.tracking);
  // « Commande reçue » : le lien de chaque certificat, et son code de rattachement si la pièce est offerte
  const certificates = stage === "paid" ? await certificateCodesOfOrder(full).catch(() => []) : [];
  const list = (items: string[]) => items.join("\u00a0; ");
  return {
    certificats: list(certificates.map((c) => `${c.productTitle}, ${c.url}`)),
    codes: list(certificates.flatMap((c) => (c.code ? [`${c.productTitle}\u00a0: ${c.code}`] : []))),
    prenom: firstName(full),
    commande: full.number,
    suivi: absolute(orderLink(full)),
    delai: lead && catalogue?.delai ? delaiText(catalogue, lead) : "",
    debut: estimate ? formatDate(estimate.from) : "",
    fin: estimate ? formatDate(estimate.to) : "",
    retrait: full.shipping.pickup ? "oui" : "",
    transporteur: full.shipping.carrier ?? "",
    numeroSuivi: full.shipping.tracking ?? "",
    lienColis: url ?? "",
    relais: full.shipping.relay ? `${full.shipping.relay.name}, ${full.shipping.relay.address}` : "",
  };
}

type DetailTexts = { taille: string; quantite: string; livraison: string; offerte: string; total: string };

/**
 * Détail de la commande pour le bloc « Détail de la commande » de l'e-mail « Commande reçue »
 * (libellés du document « suivi-commande », clé `detail`).
 */
async function orderDetail(order: Order): Promise<{ items: EmailItem[]; totals: { label: string; value: string }[] }> {
  const t = ((await readDoc("suivi-commande", "fr").catch(() => null)) as { detail?: DetailTexts } | null)?.detail;
  if (!t) return { items: [], totals: [] };
  return {
    items: order.lines.map((l) => ({
      title: l.title,
      meta: [fill(t.taille, { taille: l.size }), l.quantity > 1 ? fill(t.quantite, { n: l.quantity }) : null].filter(Boolean).join(" · "),
      price: formatPrice(l.unitPrice * l.quantity),
    })),
    totals: [
      { label: t.livraison, value: order.shipping.price ? formatPrice(order.shipping.price) : t.offerte },
      { label: t.total, value: formatPrice(order.total) },
    ],
  };
}

export interface StageEmailOptions {
  /** détail de commande déjà composé (tunnel de paiement) : remplace celui calculé ici */
  items?: EmailItem[];
  totals?: { label: string; value: string }[];
  /** facture jointe, par exemple */
  attachments?: OutgoingEmail["attachments"];
  /** repères supplémentaires ou corrigés */
  vars?: Record<string, string>;
}

/**
 * Envoie à la cliente l'e-mail de l'étape franchie. Renvoie faux s'il était déjà parti (ou part
 * en ce moment) pour cette commande et cette étape, ou si la commande n'a pas d'adresse e-mail.
 */
export async function sendOrderStageEmail(order: Order, stage: MailedStage, opts: StageEmailOptions = {}): Promise<boolean> {
  if (!order.email) return false;
  const key = sentKey(order, stage);
  if (await kv.get(key)) return false;
  // verrou de quelques minutes : deux appels simultanés n'envoient jamais deux e-mails
  if ((await kv.incr(`${key}:verrou`, 300)) > 1) return false;
  try {
    const vars = { ...(await stageEmailVars(order, stage)), ...opts.vars };
    const detail = stage === "paid" ? { ...(await orderDetail(order)), ...(opts.items ? { items: opts.items } : {}), ...(opts.totals ? { totals: opts.totals } : {}) } : {};
    await sendDocEmail(STAGE_EMAILS[stage], order.email, { vars, ...detail, attachments: opts.attachments, tag: STAGE_EMAILS[stage] });
    await kv.set(key, new Date().toISOString());
    return true;
  } finally {
    await kv.del(`${key}:verrou`);
  }
}
