/**
 * Ce qui suit le paiement d'une commande, quel que soit le chemin (paiement d'essai de la
 * démonstration, webhook de Stripe, retour de la cliente sur la page de confirmation) : la commande
 * passe à « Commande reçue », est copiée dans la base clientes, la facture est émise, les certificats
 * aussi, l'e-mail « Commande reçue » part avec la facture, les agents sont prévenus.
 *
 * Une seule fois par commande, même si le webhook de Stripe et le retour de la cliente arrivent en
 * même temps, ou si Stripe renvoie le même événement (verrou du stockage, jamais expiré).
 */
import "server-only";
import { after } from "next/server";
import { kv } from "@/lib/store";
import { shop } from "@/content/settings";
import { getAllProducts } from "@/lib/commerce";
import { saveOrder, updateOrder } from "@/lib/commerce/orders";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import { getDoc } from "@/lib/edition/read";
import { formatPrice } from "@/lib/format";
import { upsertOrder } from "@/lib/customers/commandes-base";
import { upsertContact } from "@/lib/marketing/provider";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { issueInvoice } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import { issueCertificates } from "@/lib/certificates";
import { sendOrderStageEmail } from "@/lib/email/commandes";
import { onOrderCreated } from "@/lib/agents/events";
import { runCommandesConfectionAgent } from "@/lib/agents/team/commandes-confection";
import type { Order } from "@/lib/commerce/types";

const VINGT_ANS = 60 * 60 * 24 * 365 * 20;
const cle = (id: string) => `commandes:finalisee:${id}`;

/** Lance une tâche après la réponse quand on est dans une requête, tout de suite sinon. */
function ensuite(tache: () => Promise<unknown>) {
  try {
    after(() => tache().then(() => undefined));
  } catch {
    void tache();
  }
}

/** La commande a-t-elle déjà été finalisée ? */
export async function dejaFinalisee(id: string): Promise<boolean> {
  return (await kv.peek(cle(id))) > 0;
}

/**
 * Finalise une commande payée. Renvoie false si elle l'était déjà (rien n'est refait). Les étapes
 * qui échouent sont consignées sans empêcher les suivantes : une facture en retard ne bloque pas
 * l'e-mail, et la commande reste « reçue » dans l'Atelier.
 */
export async function finaliserCommande(commande: Order): Promise<boolean> {
  if ((await kv.incr(cle(commande.id), VINGT_ANS)) !== 1) return false;
  // dernière version enregistrée (le paiement a pu être complété entre-temps), passée à « reçue »
  const recue = (o: Order): Order => ({ ...o, status: o.status === "pending" ? "paid" : o.status });
  let order = await updateOrder(commande.id, recue);
  if (!order) {
    order = recue(commande);
    await saveOrder(order);
  }

  // base clientes : commande recopiée et rattachée au compte de même e-mail
  ensuite(() => upsertOrder({ ...order, source: order.source }).catch((e) => console.error("[commande] base clientes", e)));
  if (order.consents?.newsletter) {
    const list = (await kv.get<{ email: string; date: string; source?: string }[]>("newsletter:subscribers")) ?? [];
    if (!list.some((s) => s.email === order.email)) await kv.set("newsletter:subscribers", [...list, { email: order.email, date: order.createdAt, source: "commande" }]);
    ensuite(async () => {
      await upsertContact({ email: order.email, firstName: order.address?.firstName, lastName: order.address?.lastName, marketing: true }).catch((e) => console.error("[commande] e-mails", e));
      await onNewsletterSignup(order.email).catch(() => {});
    });
  }

  // facture émise dès le paiement (numérotation continue), jointe à l'e-mail de confirmation
  const invoice = await issueInvoice(order).catch((e) => {
    console.error("[commande] facture", e);
    return null;
  });
  const invoiceFile = invoice ? await invoicePdf(invoice).catch(() => null) : null;

  // un certificat d'authenticité numérique par pièce (QR code, rattachement au compte)
  await issueCertificates(order).catch((e) => {
    console.error("[commande] certificats", e);
    return [];
  });

  // e-mail « Commande reçue » (document email-commande-recue, modifiable dans l'Atelier) : pièces et
  // délais, totaux, facture jointe ; il ne part qu'une fois par commande (lib/email/commandes.ts)
  const [products, tCommerce, tCatalogue] = await Promise.all([
    getAllProducts(),
    getDoc<CommerceTexts>("commerce", undefined, { plain: true }),
    getDoc<CatalogueTexts>("catalogue", undefined, { plain: true }),
  ]);
  const tp = tCommerce.panier;
  const relay = order.shipping.relay;
  const taxes = order.taxes;
  await sendOrderStageEmail(order, "paid", {
    attachments: invoice && invoiceFile ? [{ filename: `${invoice.number}.pdf`, content: invoiceFile }] : undefined,
    items: order.lines.map((l) => {
      const p = products.find((x) => x.handle === l.handle);
      return {
        title: l.title,
        meta: [fill(tCommerce.confirmation.taille, { taille: l.size }), l.quantity > 1 ? fill(tCommerce.commande.pieces, { n: l.quantity }) : null, p ? fill(tCatalogue.fabrication.delaiTexte, { delai: delaiText(tCatalogue, p.leadTime) }) : null].filter(Boolean).join(" · "),
        price: formatPrice(l.unitPrice * l.quantity),
        image: p?.images[0]?.src,
      };
    }),
    totals: [
      { label: fill(tCommerce.confirmation.livraison, { mode: relay ? `${order.shipping.method}, ${relay.name}` : order.shipping.method }), value: order.shipping.price ? formatPrice(order.shipping.price) : tp.offerte },
      ...(order.gift?.wrap ? [{ label: tp.emballage, value: formatPrice(shop.giftWrapPrice) }] : []),
      ...(taxes?.export ? [{ label: tCommerce.commande.droitsEtTaxes, value: formatPrice(taxes.export.duty + taxes.export.importVat) }] : []),
      { label: taxes?.export ? tCommerce.commande.totalTaxes : tp.total, value: formatPrice(order.total) },
    ],
  }).catch((e) => console.error("[commande] e-mail", e));

  await onOrderCreated(order).catch((e) => console.error("[commande] agents", e));
  ensuite(() => runCommandesConfectionAgent("evenement").catch((e) => console.error("[agent commandes-confection]", e)));
  return true;
}
