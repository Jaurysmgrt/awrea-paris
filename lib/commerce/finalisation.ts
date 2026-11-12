/**
 * Ce qui suit le paiement d'une commande, quel que soit le chemin (paiement d'essai de la
 * démonstration, webhook de Stripe, retour de la cliente sur la page de confirmation, relance par
 * l'agent des commandes) : la commande passe à « Commande reçue », est copiée dans la base clientes,
 * la facture est émise, les certificats aussi, l'e-mail « Commande reçue » part avec la facture, les
 * agents sont prévenus.
 *
 * Chaque étape ne se fait qu'une fois (facture par commande, certificats sous leur verrou, e-mail
 * gardé par commande et par étape) : la finalisation peut donc être relancée sans rien doubler. Elle
 * n'est marquée terminée que si toutes les étapes ont réussi ; sinon elle lève une erreur, et le
 * prochain essai (Stripe renvoie l'événement, la cliente revient, l'agent repasse) reprend les étapes
 * manquantes. Une seule finalisation à la fois par commande (verrou à jeton).
 *
 * Les marques (finalisation terminée, journal de l'Atelier) vivent dans le stockage partagé Upstash,
 * seul admis sur la boutique réelle ; en démonstration avec le stockage fichier, elles ne durent que
 * le temps du processus.
 */
import "server-only";
import { after } from "next/server";
import { kv } from "@/lib/store";
import { shop } from "@/content/settings";
import { getAllProducts } from "@/lib/commerce";
import { saveOrder, setOrderStatus, statutRegle, updateOrder } from "@/lib/commerce/orders";
import { prendreVerrou, rendreVerrou } from "@/lib/store/verrou";
import { delaiText, fill, type CatalogueTexts, type CommerceTexts } from "@/lib/commerce/texts";
import { getDoc } from "@/lib/edition/read";
import { formatPrice } from "@/lib/format";
import { upsertOrder } from "@/lib/customers/commandes-base";
import { inscrireALaLettre } from "@/lib/crm/lettre";
import { consommerPrivilege } from "@/lib/privilege";
import { issueInvoice } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import { issueCertificates } from "@/lib/certificates";
import { sendOrderStageEmail } from "@/lib/email/commandes";
import { onOrderCreated } from "@/lib/agents/events";
import { signaler } from "@/lib/admin/push";
import { runCommandesConfectionAgent } from "@/lib/agents/team/commandes-confection";
import type { Order } from "@/lib/commerce/types";

const VINGT_ANS = 60 * 60 * 24 * 365 * 20;
const cle = (id: string) => `commandes:finalisee:${id}`;

/** Une étape de la finalisation n'a pas abouti : elle sera reprise au prochain essai. */
export class FinalisationIncomplete extends Error {}

/** Lance une tâche après la réponse quand on est dans une requête, tout de suite sinon. */
function ensuite(tache: () => Promise<unknown>) {
  try {
    after(() => tache().then(() => undefined));
  } catch {
    void tache();
  }
}

/** La commande a-t-elle été entièrement finalisée ? */
export async function dejaFinalisee(id: string): Promise<boolean> {
  return (await kv.peek(cle(id))) > 0;
}

/**
 * Finalise une commande payée. Renvoie false si elle l'était déjà, ou si une autre finalisation de
 * la même commande est en cours ; lève FinalisationIncomplete si une étape a échoué (les autres sont
 * faites quand même : une facture en retard ne bloque pas l'e-mail).
 */
export async function finaliserCommande(commande: Order): Promise<boolean> {
  if (await dejaFinalisee(commande.id)) return false;
  // deux minutes au plus : un serveur arrêté en cours de route ne bloque pas le prochain essai
  const jeton = await prendreVerrou(`finalisation:${commande.id}`, 120_000);
  if (!jeton) return false;
  try {
    if (await dejaFinalisee(commande.id)) return false;
    const echecs = await etapes(commande);
    if (echecs.length) throw new FinalisationIncomplete(`Commande ${commande.number} payée, finalisation incomplète (${echecs.join(", ")}) : elle sera reprise.`);
    await kv.incr(cle(commande.id), VINGT_ANS);
    return true;
  } finally {
    await rendreVerrou(`finalisation:${commande.id}`, jeton);
  }
}

async function etapes(commande: Order): Promise<string[]> {
  const echecs: string[] = [];
  const noter = (etape: string) => (e: unknown) => {
    console.error(`[commande] ${etape}`, e);
    echecs.push(etape);
    return null;
  };
  // dernière version enregistrée (le paiement a pu être complété entre-temps), passée à « reçue »
  const recue = (o: Order): Order => ({ ...o, status: o.status === "pending" ? "paid" : o.status });
  let order = await updateOrder(commande.id, recue);
  if (!order) {
    order = recue(commande);
    await saveOrder(order);
  }
  // une étape « en attente de paiement » réglée à part ne cache jamais une commande payée (une
  // commande mise de côté par la créatrice ou l'anti-fraude le reste)
  const reglee = await statutRegle(order.id);
  if (reglee === "pending") await setOrderStatus(order.id, "paid");
  order = { ...order, status: reglee === "pending" ? "paid" : (reglee ?? order.status) };

  // base clientes : commande recopiée et rattachée au compte de même e-mail
  ensuite(() => upsertOrder({ ...order, source: order.source }).catch((e) => console.error("[commande] base clientes", e)));
  // privilège de bienvenue : utilisé par cette commande, pour toujours (rejouer ne change rien) ; si
  // une autre commande l'avait déjà utilisé, la créatrice le sait
  if (order.privilege) {
    const payee = order;
    const r = await consommerPrivilege(payee.email, payee.id, payee.number).catch(noter("privilège de bienvenue"));
    if (r?.conflit)
      await signaler({ type: "intervention", titre: `Privilège de la commande ${payee.number}`, texte: "Le privilège de bienvenue de cette adresse avait déjà servi pour une autre commande : vérifiez la remise accordée.", chemin: `/commandes/${encodeURIComponent(payee.number)}`, etiquette: `privilege-${payee.number}` }).catch(() => {});
  }

  // case « Recevoir la lettre » cochée à la commande : inscription demandée dans la fiche (lib/crm) et
  // e-mail de confirmation, une seule fois par commande ; la bienvenue suit le clic sur son lien
  const lettreFaite = `${cle(order.id)}:lettre`;
  if (order.consents?.newsletter && (await kv.peek(lettreFaite)) === 0) {
    await inscrireALaLettre({ email: order.email, prenom: order.address?.firstName, nom: order.address?.lastName, telephone: order.address?.phone, source: "commande" })
      .then(() => kv.incr(lettreFaite, VINGT_ANS))
      .catch(noter("lettre d’information"));
  }

  // facture émise dès le paiement (numérotation continue), jointe à l'e-mail de confirmation
  const invoice = await issueInvoice(order).catch(noter("facture"));
  const invoiceFile = invoice ? await invoicePdf(invoice).catch(() => null) : null;

  // un certificat d'authenticité numérique par pièce (QR code, rattachement au compte)
  await issueCertificates(order).catch(noter("certificats"));

  // e-mail « Commande reçue » (document email-commande-recue, modifiable dans l'Atelier) : pièces et
  // délais, totaux, facture jointe ; il ne part qu'une fois par commande (lib/email/commandes.ts)
  const textes = await Promise.all([
    getAllProducts(),
    getDoc<CommerceTexts>("commerce", undefined, { plain: true }),
    getDoc<CatalogueTexts>("catalogue", undefined, { plain: true }),
  ]).catch(noter("e-mail"));
  if (!textes) return echecs;
  const [products, tCommerce, tCatalogue] = textes;
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
      // remise (privilège de bienvenue ou code) : une ligne, sans prix barré
      ...(order.discount?.amount ? [{ label: order.discount.label, value: `− ${formatPrice(order.discount.amount)}` }] : []),
      { label: fill(tCommerce.confirmation.livraison, { mode: relay ? `${order.shipping.method}, ${relay.name}` : order.shipping.method }), value: order.shipping.price ? formatPrice(order.shipping.price) : tp.offerte },
      ...(order.gift?.wrap ? [{ label: tp.emballage, value: formatPrice(shop.giftWrapPrice) }] : []),
      ...(taxes?.export ? [{ label: tCommerce.commande.droitsEtTaxes, value: formatPrice(taxes.export.duty + taxes.export.importVat) }] : []),
      { label: taxes?.export ? tCommerce.commande.totalTaxes : tp.total, value: formatPrice(order.total) },
    ],
  }).catch(noter("e-mail"));

  // journal de l'Atelier : une ligne par commande, même si la finalisation est reprise
  if ((await kv.incr(`${cle(order.id)}:agents`, VINGT_ANS)) === 1) {
    await onOrderCreated(order).catch((e) => console.error("[commande] agents", e));
    // application de l'Atelier : le numéro et le montant, jamais le nom de la cliente
    const pieces = order.lines.reduce((t, l) => t + l.quantity, 0);
    await signaler({ type: "commande", titre: "Nouvelle commande", texte: `Commande ${order.number}, ${formatPrice(order.total)}, ${pieces} pièce${pieces > 1 ? "s" : ""}.`, chemin: `/commandes/${encodeURIComponent(order.number)}`, etiquette: `commande-${order.number}` });
  }
  ensuite(() => runCommandesConfectionAgent("evenement").catch((e) => console.error("[agent commandes-confection]", e)));
  return echecs;
}
