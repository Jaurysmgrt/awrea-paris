/**
 * Déroulé d'un retour : demande de la cliente (étiquette, e-mails), puis gestes de l'atelier dans
 * l'Atelier — colis reçu, remboursement (avoir émis, e-mail), échange de taille, refus, dépôt
 * d'une étiquette. Le remboursement est déclenché par la créatrice elle-même, après confirmation
 * (l'argent n'est jamais rendu sans elle) ; chaque geste est inscrit au journal des actions.
 */
import "server-only";
import { getOrder, setOrderStatus } from "@/lib/commerce/orders";
import { adminEnabled, shopifyRefundLines } from "@/lib/shopify/admin";
import { issueCreditNote } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { formatPrice } from "@/lib/format";
import { logAction } from "@/lib/agents/log";
import { orderLink } from "@/lib/commerce/order-access";
import { identity } from "@/content/brand/identity";
import { createReturn, getReturn, reasonLabel, returnsOf, saveReturn, type ReturnItem, type ReturnRequest } from "./returns";
import { createReturnLabel, demoLabelPdf, storeLabel, storedLabel } from "./labels";
import type { Order } from "@/lib/commerce/types";

const first = (r: ReturnRequest) => r.name.split(" ")[0] || "Madame";

/** Le PDF de l'étiquette (enregistré, ou produit à la volée en démonstration). */
export async function returnLabelPdf(r: ReturnRequest, order: Order): Promise<Uint8Array | null> {
  if (r.labelPending) return null;
  return (await storedLabel(r.id)) ?? (r.label?.provider === "mock" ? demoLabelPdf(r, order) : null);
}

export async function submitReturn(order: Order, items: ReturnItem[], comment?: string): Promise<ReturnRequest> {
  const r = await createReturn(order, items, comment);
  const { label, pending } = await createReturnLabel(r, order);
  r.label = label;
  r.labelPending = Boolean(pending);
  await saveReturn(r);
  const pdf = await returnLabelPdf(r, order);
  const list = items.map((i) => `${i.title} en taille ${i.size}, ${i.wish === "echange" ? `pour un échange contre la taille ${i.exchangeSize}` : "pour un remboursement"}`);
  await sendEmail({
    to: order.email,
    subject: `Votre retour ${r.id}`,
    tag: "retour",
    attachments: pdf ? [{ filename: `etiquette-${r.id}.pdf`, content: pdf }] : undefined,
    ...brandEmail({
      preheader: pending ? "Votre demande est enregistrée ; l’étiquette suit." : "Votre étiquette de retour est jointe.",
      title: "Votre retour",
      paragraphs: [
        `Bonjour ${first(r)},`,
        `Votre demande de retour ${r.id} pour la commande ${order.number} est enregistrée : ${list.join(" ; ")}.`,
        pending
          ? "L’atelier vous envoie l’étiquette de retour par e-mail dans la journée."
          : "Imprimez l’étiquette jointe, collez-la sur le colis avec la pièce non portée, ses étiquettes et son certificat, puis déposez-le en bureau de poste.",
        "Nous vous écrirons dès que l’atelier l’aura reçu.",
      ],
      cta: { label: "Suivre mon retour", href: orderLink(order) },
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  }).catch((e) => console.error("[retour] e-mail cliente", e));
  await sendEmail({
    to: process.env.ATELIER_EMAIL || identity.email,
    subject: `Retour ${r.id} pour la commande ${order.number}${pending ? " (étiquette à déposer)" : ""}`,
    tag: "retour-atelier",
    ...brandEmail({
      preheader: `${items.length} pièce(s) en retour`,
      title: `Retour ${r.id}`,
      paragraphs: [
        `${r.name} (${order.email}) retourne : ${items.map((i) => `${i.title} en taille ${i.size}, motif « ${reasonLabel[i.reason]} », ${i.wish === "echange" ? `échange en ${i.exchangeSize}` : "remboursement"}`).join(" ; ")}.`,
        ...(r.comment ? [`Son mot : « ${r.comment} »`] : []),
        pending ? "L’étiquette prépayée n’a pas pu être obtenue automatiquement : déposez-la dans l’Atelier, rubrique Retours." : "L’étiquette lui a été envoyée.",
      ],
      cta: { label: "Ouvrir les retours", href: "atelier:/retours" },
    }),
  }).catch((e) => console.error("[retour] e-mail atelier", e));
  await logAction({ agent: "systeme", kind: "flag_order", status: "info", summary: `Retour ${r.id} demandé (commande ${order.number})`, target: { type: "order", id: order.id, label: order.number, href: `atelier:/commandes/${encodeURIComponent(order.number)}` } });
  return r;
}

async function load(id: string) {
  const r = await getReturn(id);
  if (!r) throw new Error("Retour introuvable");
  const order = await getOrder(r.orderNumber);
  if (!order) throw new Error("Commande introuvable");
  return { r, order };
}

export async function receiveReturn(id: string): Promise<ReturnRequest> {
  const { r, order } = await load(id);
  if (r.status !== "demande") throw new Error("Ce retour a déjà été réceptionné.");
  r.status = "recu";
  await saveReturn(r);
  await sendEmail({
    to: order.email,
    subject: `Votre retour ${r.id} est arrivé à l’atelier`,
    tag: "retour-recu",
    ...brandEmail({
      preheader: "La pièce est bien arrivée.",
      title: "Votre pièce est arrivée",
      paragraphs: [`Bonjour ${first(r)},`, "Votre colis est bien arrivé à l’atelier. Nous vérifions la pièce et revenons vers vous très vite pour la suite."],
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  }).catch(() => {});
  await logAction({ agent: "systeme", kind: "update_stock", status: "done", summary: `Retour ${r.id} réceptionné à l’atelier` });
  return r;
}

/** Remboursement des pièces à rembourser du retour (geste de la créatrice) : avoir émis et envoyé. */
export async function refundReturn(id: string): Promise<{ r: ReturnRequest; amount: number }> {
  const { r, order } = await load(id);
  if (!["recu", "demande"].includes(r.status)) throw new Error("Ce retour n’est plus à rembourser.");
  const items = r.items.filter((i) => i.wish === "remboursement");
  if (!items.length) throw new Error("Aucune pièce à rembourser dans ce retour (échange seulement).");
  if (adminEnabled) await shopifyRefundLines(order.id, items, `Retour ${r.id}`);
  const note = await issueCreditNote(
    order,
    items.map((i) => ({ title: i.title, detail: `Taille ${i.size} · retour ${r.id}`, quantity: 1, unitTtc: i.unitPrice })),
    `retour ${r.id}`,
  );
  const amount = note.totals.ttc;
  r.status = "rembourse";
  await saveReturn(r);
  if (!adminEnabled) {
    const all = (await returnsOf(order.number)).filter((x) => x.status === "rembourse").flatMap((x) => x.items).length;
    await setOrderStatus(order.id, all >= order.lines.length ? "refunded" : "returned");
    // pièces créées sur demande : aucune remise en stock
  }
  const pdf = await invoicePdf(note).catch(() => null);
  await sendEmail({
    to: order.email,
    subject: `Remboursement de votre retour ${r.id}`,
    tag: "remboursement",
    attachments: pdf ? [{ filename: `${note.number}.pdf`, content: pdf }] : undefined,
    ...brandEmail({
      preheader: `${formatPrice(amount)} remboursés.`,
      title: "Votre remboursement",
      paragraphs: [`Bonjour ${first(r)},`, `Nous avons remboursé ${formatPrice(amount)} sur votre moyen de paiement d’origine : il apparaîtra sous quelques jours. L’avoir ${note.number} est joint à ce message.`],
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  }).catch(() => {});
  await logAction({ agent: "systeme", kind: "refund_order", status: "approved", summary: `Remboursement du retour ${r.id} par la créatrice : ${formatPrice(amount)} (avoir ${note.number})`, target: { type: "order", id: order.id, label: order.number, href: `atelier:/commandes/${encodeURIComponent(order.number)}` } });
  return { r, amount };
}

/** Échange de taille : la nouvelle taille est réservée et expédiée (aucun mouvement d'argent). */
export async function exchangeReturn(id: string): Promise<ReturnRequest> {
  const { r, order } = await load(id);
  const items = r.items.filter((i) => i.wish === "echange" && i.exchangeSize);
  if (!items.length) throw new Error("Aucun échange dans ce retour.");
  // pièces créées sur demande : la nouvelle taille est confectionnée, aucun stock à déplacer
  r.status = "echange-expedie";
  await saveReturn(r);
  await sendEmail({
    to: order.email,
    subject: `Votre nouvelle taille est en route`,
    tag: "echange",
    ...brandEmail({
      preheader: "Échange de taille expédié.",
      title: "Votre échange",
      paragraphs: [`Bonjour ${first(r)},`, `Nous vous envoyons ${items.map((i) => `${i.title} en taille ${i.exchangeSize}`).join(" et ")}. Vous recevrez le lien de suivi dès la remise au transporteur.`],
      cta: { label: "Suivre ma commande", href: orderLink(order) },
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  }).catch(() => {});
  await logAction({ agent: "systeme", kind: "update_stock", status: "done", summary: `Échange de taille expédié pour le retour ${r.id}` });
  return r;
}

export async function refuseReturn(id: string, reason: string): Promise<ReturnRequest> {
  const { r, order } = await load(id);
  r.status = "refuse";
  await saveReturn(r);
  await sendEmail({
    to: order.email,
    subject: `Votre retour ${r.id}`,
    tag: "retour-refuse",
    ...brandEmail({
      preheader: "À propos de votre retour.",
      title: "Votre retour",
      paragraphs: [`Bonjour ${first(r)},`, `Nous ne pouvons malheureusement pas accepter ce retour : ${reason}`, "Répondez simplement à ce message : l’atelier cherchera avec vous la meilleure solution."],
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  }).catch(() => {});
  await logAction({ agent: "systeme", kind: "flag_order", status: "info", summary: `Retour ${r.id} refusé : ${reason}` });
  return r;
}

/** L'atelier dépose l'étiquette prépayée (PDF) : elle part aussitôt à la cliente. */
export async function uploadReturnLabel(id: string, pdf: Uint8Array): Promise<ReturnRequest> {
  const { r, order } = await load(id);
  await storeLabel(r.id, pdf);
  r.label = { provider: "atelier", carrier: "Colissimo", tracking: r.label?.tracking ?? r.id, createdAt: new Date().toISOString() };
  r.labelPending = false;
  await saveReturn(r);
  await sendEmail({
    to: order.email,
    subject: `Votre étiquette de retour ${r.id}`,
    tag: "retour-etiquette",
    attachments: [{ filename: `etiquette-${r.id}.pdf`, content: pdf }],
    ...brandEmail({
      preheader: "Votre étiquette de retour est jointe.",
      title: "Votre étiquette",
      paragraphs: [`Bonjour ${first(r)},`, "Voici votre étiquette de retour prépayée. Collez-la sur le colis et déposez-le en bureau de poste : nous vous écrirons à son arrivée."],
      cta: { label: "Suivre mon retour", href: orderLink(order) },
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  });
  await logAction({ agent: "systeme", kind: "send_reply", status: "done", summary: `Étiquette du retour ${r.id} déposée et envoyée` });
  return r;
}
