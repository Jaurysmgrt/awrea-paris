/**
 * Exécuteurs des actions des agents. Chaque action a un schéma de paramètres (validé) et une
 * exécution sur les données de la boutique de la Maison (catalogue, commandes, clientes).
 *
 * Modèle « sur demande » : aucune action ne touche à un stock ni à une liste d'attente. Les prix,
 * délais et indicateurs « provisoire » passent par lib/commerce/pieces.ts, comme dans l'Atelier.
 */
import * as z from "zod/v4";
import { revalidatePath } from "next/cache";
import { kv } from "@/lib/store";
import { lirePiece } from "@/lib/commerce/atelier-catalogue";
import { DEMO_KEYS, demoHandlesPris } from "@/lib/commerce/catalog-demo";
import { getAllProducts, getProduct } from "@/lib/commerce";
import { getOrder, setOrderStatus } from "@/lib/commerce/orders";
import { dejaRembourse, marquerRembourse, sousVerrouArgent } from "@/lib/commerce/argent";
import { issueCreditNote } from "@/lib/invoices";
import { invoicePdf } from "@/lib/invoices/pdf";
import type { Order, Product } from "@/lib/commerce/types";
import { boutiqueReelle } from "@/lib/config/boutique";
import { rembourserParStripe } from "@/lib/paiement/suivi";
import { DEFAULT_LEAD_TIME } from "@/lib/commerce/availability";
import { updatePiece } from "@/lib/commerce/pieces";
import { updateInbox, listInbox } from "@/lib/inbox";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { identity } from "@/content/brand/identity";
import { formatPrice, slugify } from "@/lib/format";
import { JOURNAL_KEY } from "@/lib/content/journal";
import type { Article } from "@/content/fr/journal";
import type { ActionType } from "./policy";
import { sendDocEmail } from "@/lib/email/documents";
import { absolute } from "@/lib/seo/metadata";
import { orderLink } from "@/lib/commerce/order-access";
import { getReturn } from "@/lib/returns";
import { listReviews, moderateReview } from "@/lib/reviews";
import { listCustomerStats, updateProfile } from "@/lib/customers";
import { draftOf, isDocId, publishContent, publishedDoc } from "@/lib/edition/store";
import { editionStorage, isLocale } from "@/lib/edition/config";
import { avisPublicable, envoiPermis, envoisFaits, noterEnvoi } from "./autonomie";
import { corrigerContenu, resumerCorrections } from "./corrections";
import { signaler } from "@/lib/admin/push";

const atelierEmail = () => process.env.ATELIER_EMAIL ?? identity.email;

const refresh = () => {
  try {
    revalidatePath("/", "layout");
  } catch {
    /* hors contexte de requête (script) */
  }
};

/* ------------------------------------------------------------------ SCHÉMAS */

const Size = z.enum(["XS", "S", "M", "L", "XL", "TU"]);
const ImageSchema = z.object({ src: z.string().min(1), alt: z.string().min(3).max(240), width: z.number().int().positive(), height: z.number().int().positive() });

export const ProductDraftSchema = z.object({
  title: z.string().min(2).max(80),
  handle: z.string().max(80).optional(),
  tagline: z.string().min(5).max(200),
  category: z.enum(["robe", "body", "top", "jupe", "accessoire"]),
  collection: z.string().max(80),
  price: z.number().int().positive().describe("Prix en centimes d’euro"),
  price_provisional: z.boolean().default(false),
  /** délai de fabrication en semaines : chaque pièce est créée sur demande, sans stock */
  lead_time: z.object({ min: z.number().int().min(1).max(26), max: z.number().int().min(1).max(26) }).optional(),
  lead_time_provisional: z.boolean().default(true),
  sizes: z.array(Size).min(1),
  images: z.array(ImageSchema).min(1),
  description: z.array(z.string().min(20)).min(1).max(4),
  /** composition connue seulement : vide tant que la Maison ne l'a pas donnée (jamais inventée) */
  materials: z.array(z.object({ name: z.string(), percent: z.number().min(0).max(100) })).default([]),
  lining: z.string().optional(),
  /** conseils connus, sinon un repère « [À COMPLÉTER : …] » */
  care: z.array(z.string()).min(1),
  fit: z.string().min(10),
  model: z.string().default(""),
  details: z.array(z.string()).default([]),
  seo: z.object({ title: z.string().min(10).max(70), description: z.string().min(50).max(170) }),
  tags: z.array(z.string()).default([]),
  // une pièce naît toujours en brouillon : la créatrice la relit, puis la met en ligne (lot 2 de la refonte)
  status: z.literal("draft").default("draft"),
});
export type ProductDraft = z.infer<typeof ProductDraftSchema>;

export const ArticleSchema = z.object({
  title: z.string().min(10).max(110),
  slug: z.string().max(90).optional(),
  excerpt: z.string().min(30).max(240),
  category: z.enum(["Moodboard", "Coulisses", "Savoir-faire", "Lettre"]),
  cover: ImageSchema,
  sections: z.array(z.object({ heading: z.string().max(90).optional(), paragraphs: z.array(z.string().min(20)).min(1) })).min(2).max(6),
  seo: z.object({ title: z.string().min(10).max(70), description: z.string().min(50).max(170) }),
});

export const ACTION_SCHEMAS = {
  publish_product: z.object({ product: ProductDraftSchema }),
  update_product_content: z.object({
    handle: z.string(),
    tagline: z.string().max(200).optional(),
    description: z.array(z.string()).max(4).optional(),
    seo: z.object({ title: z.string().max(70), description: z.string().max(170) }).optional(),
    alts: z.array(z.object({ index: z.number().int().min(0), alt: z.string().min(3).max(240) })).optional(),
  }),
  send_reply: z.object({ messageId: z.string(), subject: z.string().max(120), body: z.string().min(20).max(4000) }),
  save_reply_draft: z.object({ messageId: z.string(), body: z.string().min(20).max(4000), note: z.string().max(600).optional(), sensitive: z.boolean() }),
  escalate_message: z.object({ messageId: z.string(), reason: z.string().max(400) }),
  flag_order: z.object({ orderId: z.string(), reason: z.string().max(400) }),
  alert_atelier: z.object({ subject: z.string().max(120), body: z.string().max(4000) }),
  publish_article: z.object({ article: ArticleSchema }),
  update_ai_visibility: z.object({ notes: z.array(z.string().max(300)).max(12) }),
  save_content_draft: z.object({
    kind: z.enum(["instagram", "newsletter"]),
    title: z.string().max(120),
    body: z.string().max(4000),
    hashtags: z.array(z.string()).max(12).optional(),
    image: z.string().optional(),
    subject: z.string().max(80).optional(),
    preheader: z.string().max(140).optional(),
  }),
  send_report: z.object({ subject: z.string().max(120), summary: z.string().max(6000), metrics: z.record(z.string(), z.union([z.string(), z.number()])) }),
  refund_order: z.object({ orderId: z.string(), reason: z.string().max(400) }),
  change_price: z.object({ handle: z.string(), price: z.number().int().positive() }),
  delete_product: z.object({ handle: z.string() }),
  cancel_order: z.object({ orderId: z.string(), refund: z.boolean() }),
  send_newsletter_all: z.object({ subject: z.string().max(80), preheader: z.string().max(140), paragraphs: z.array(z.string()).min(1).max(8), cta: z.object({ label: z.string(), href: z.string() }).optional() }),
  // le message part à l'adresse de la commande, jamais à une adresse fournie par un agent
  send_client_message: z.object({ orderId: z.string(), subject: z.string().min(3).max(120), body: z.string().min(20).max(4000) }),
  confirm_piece_terms: z.object({ handle: z.string(), price: z.boolean(), leadTime: z.boolean() }).refine((x) => x.price || x.leadTime, "Rien à confirmer"),
  // autonomes dans les limites choisies par la créatrice : des identifiants seulement, aucun texte
  // ni aucune adresse venus d'un agent ; l'e-mail est celui de la Maison, l'adresse est lue ici
  notify_delay: z.object({ orderId: z.string().min(1).max(80) }),
  publish_review: z.object({ reviewId: z.string().min(1).max(80) }),
  correct_page: z.object({ doc: z.string().min(1).max(80), locale: z.string().min(2).max(5) }),
  send_relance: z.object({ kind: z.enum(["retour", "sur-mesure", "cercle"]), id: z.string().min(1).max(120) }),
} satisfies Record<ActionType, z.ZodType>;

export type ActionParams<T extends ActionType> = z.infer<(typeof ACTION_SCHEMAS)[T]>;

export interface ActionResult {
  summary: string;
  target?: { type: string; id: string; label?: string; href?: string };
}

/* ---------------------------------------------------------------- EXÉCUTION */

/**
 * Remboursement complet d'une commande (annulée ou non), par tous les chemins : un seul geste à la
 * fois par commande, jamais deux fois la même (lib/commerce/argent.ts). Puis, une fois l'argent
 * parti : l'avoir, et l'e-mail de la Maison à la cliente avec l'avoir ; un e-mail qui ne part pas ne
 * fait pas passer le remboursement pour un échec (le résumé le dit).
 */
async function rembourserCommande(o: Order, motif: string, annuler: boolean): Promise<ActionResult> {
  const parStripe = o.payment?.prestataire === "stripe";
  // boutique réelle : seul un paiement passé par Stripe se rembourse d'ici, par Stripe
  if (boutiqueReelle() && !parStripe) throw new Error(`La commande ${o.number} n’a pas été payée en ligne : aucun remboursement ne peut partir de l’Atelier.`);
  if (o.status === "refunded" || (await dejaRembourse(o.id))) throw new Error(`La commande ${o.number} est déjà remboursée : rien n’est reparti.`);
  const montant = await sousVerrouArgent(o.id, async () => {
    if (await dejaRembourse(o.id)) throw new Error(`La commande ${o.number} est déjà remboursée : rien n’est reparti.`);
    let m = o.total;
    if (parStripe) {
      const frais = await getOrder(o.id);
      const reste = (frais?.payment?.montant ?? o.total) - (frais?.payment?.rembourse ?? 0);
      if (reste <= 0) throw new Error(`La commande ${o.number} est déjà remboursée : rien n’est reparti.`);
      m = (await rembourserParStripe(frais ?? o, reste, motif, { quoi: "remboursement", id: o.id })).montant;
    }
    await setOrderStatus(o.id, "refunded");
    await marquerRembourse(o.id, { montant: m, par: motif });
    return m;
  });
  let avoir: Awaited<ReturnType<typeof issueCreditNote>> | null = null;
  try {
    // une partie déjà remboursée (un retour) : l'avoir porte seulement le solde remboursé ici
    const lignes =
      montant < o.total
        ? [{ title: `Solde de la commande ${o.number}`, detail: motif, quantity: 1, unitTtc: montant }]
        : o.lines.map((l) => ({ title: l.title, detail: `Taille ${l.size}`, quantity: l.quantity, unitTtc: l.unitPrice }));
    if (montant >= o.total && o.shipping.price > 0) lignes.push({ title: "Livraison", detail: o.shipping.method, quantity: 1, unitTtc: o.shipping.price });
    avoir = await issueCreditNote(o, lignes, annuler ? "annulation" : "remboursement");
  } catch (e) {
    console.error("[argent] avoir", e);
  }
  const pdf = avoir ? await invoicePdf(avoir).catch(() => null) : null;
  const ecrit = await sendEmail({
    to: o.email,
    subject: annuler ? `Annulation de votre commande ${o.number}` : `Remboursement de votre commande ${o.number}`,
    tag: "remboursement",
    attachments: pdf && avoir ? [{ filename: `${avoir.number}.pdf`, content: pdf }] : undefined,
    ...brandEmail({
      preheader: "Votre remboursement est en cours.",
      title: annuler ? "Votre commande est annulée" : "Votre remboursement",
      paragraphs: [
        `Bonjour ${o.name.split(" ")[0]},`,
        `${annuler ? `Votre commande ${o.number} est annulée et vous` : `Votre commande ${o.number} vous`} est remboursée : ${formatPrice(montant)}, sur le moyen de paiement utilisé lors de l’achat. La somme apparaît sur votre relevé d’ici quelques jours.${avoir ? ` L’avoir ${avoir.number} est joint à ce message.` : ""}`,
      ],
      signature: "Avec toute notre attention,\nl’atelier Awrea Paris",
    }),
  })
    .then(() => true)
    .catch((e) => {
      console.error("[argent] e-mail", e);
      return false;
    });
  const suite = [avoir ? `avoir ${avoir.number}` : "avoir à émettre depuis Factures", ecrit ? "cliente prévenue" : "l’e-mail n’a pas pu partir : écrivez-lui"].join(", ");
  return { summary: `Commande ${o.number} ${annuler ? "annulée et remboursée" : "remboursée"} (${formatPrice(montant)}) : ${suite}`, target: { type: "order", id: o.id, label: o.number, href: `atelier:/commandes/${encodeURIComponent(o.number)}` } };
}

export const EXECUTORS: { [T in ActionType]: (params: ActionParams<T>) => Promise<ActionResult> } = {
  async publish_product({ product: d }) {
    const handle = d.handle ? slugify(d.handle) : slugify(d.title);
    // en ligne, en brouillon, archivée ou retirée : une adresse prise ne se réutilise pas
    const existing = (await lirePiece(handle)) ?? (await demoHandlesPris()).includes(handle);
    if (existing) throw new Error(`Une pièce existe déjà sous l’adresse /boutique/${handle}.`);
    const code = d.title.split(" ").pop()!.slice(0, 3).toUpperCase();
    const leadTime = d.lead_time && d.lead_time.min <= d.lead_time.max ? d.lead_time : DEFAULT_LEAD_TIME[d.category];
    {
      const product: Product = {
        id: `agent-${handle}`,
        handle,
        title: d.title,
        tagline: d.tagline,
        category: d.category,
        collection: d.collection,
        price: d.price,
        priceProvisional: d.price_provisional,
        leadTime,
        leadTimeProvisional: d.lead_time_provisional,
        isNew: true,
        variants: d.sizes.map((size) => ({ id: `${handle}-${size.toLowerCase()}`, sku: `AW-${code}-${size}`, size })),
        images: d.images,
        detailImage: d.images[d.images.length - 1],
        description: d.description,
        materials: d.materials,
        lining: d.lining,
        care: d.care,
        fit: d.fit,
        model: d.model,
        details: d.details,
        completeTheLook: [],
        seo: d.seo,
        tags: d.tags,
        publishedAt: new Date().toISOString().slice(0, 10),
      };
      // brouillon : dans Produits, jamais sur le site (lib/commerce/catalog-demo.ts) ; le statut
      // d'abord, pour que la pièce ne soit jamais un instant en ligne
      const statuts = (await kv.get<Record<string, string>>(DEMO_KEYS.statut)) ?? {};
      await kv.set(DEMO_KEYS.statut, { ...statuts, [handle]: "brouillon" });
      const extra = (await kv.get<Product[]>(DEMO_KEYS.extra)) ?? [];
      await kv.set(DEMO_KEYS.extra, [...extra, product]);
    }
    refresh();
    return {
      summary: `Fiche « ${d.title} » créée en brouillon (${formatPrice(d.price)}, créée sur demande en ${leadTime.min} à ${leadTime.max} semaines), à relire avant de la mettre en ligne`,
      target: { type: "product", id: handle, label: d.title, href: `atelier:/catalogue/${handle}` },
    };
  },

  async update_product_content({ handle, tagline, description, seo, alts }) {
    // brouillons et archives compris : une fiche se prépare avant d'être mise en ligne
    const p = await lirePiece(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    {
      const patches = (await kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches)) ?? {};
      const images = alts?.length ? p.images.map(({ cle: _cle, ...im }, i) => ({ ...im, alt: alts.find((a) => a.index === i)?.alt ?? im.alt })) : undefined;
      patches[handle] = { ...(patches[handle] ?? {}), ...(tagline ? { tagline } : {}), ...(description ? { description } : {}), ...(seo ? { seo } : {}), ...(images ? { images } : {}) };
      await kv.set(DEMO_KEYS.patches, patches);
    }
    refresh();
    const what = [tagline && "accroche", description && "description", seo && "balises SEO", alts?.length && `${alts.length} texte(s) alternatif(s)`].filter(Boolean).join(", ");
    return { summary: `${p.title} : ${what || "contenu"} mis à jour`, target: { type: "product", id: handle, label: p.title, href: `/boutique/${handle}` } };
  },

  async send_reply({ messageId, subject, body }) {
    const msg = (await listInbox(2000)).find((m) => m.id === messageId);
    if (!msg) throw new Error("Message introuvable");
    await sendEmail({
      to: msg.email,
      subject,
      replyTo: atelierEmail(),
      tag: "reponse-cliente",
      ...brandEmail({ preheader: body.slice(0, 90), title: subject, paragraphs: body.split(/\n{2,}/), signature: "Avec toute notre attention,\nl’atelier Awrea Paris" }),
    });
    await updateInbox(messageId, { status: "answered", answer: { body, date: new Date().toISOString(), by: "agent" } });
    return { summary: `Réponse « ${subject} » envoyée à ${msg.email}`, target: { type: "message", id: messageId, label: msg.email, href: "atelier:/messages" } };
  },

  async save_reply_draft({ messageId, body, note, sensitive }) {
    await updateInbox(messageId, { status: sensitive ? "escalated" : "drafted", draft: { body, agentNote: note, date: new Date().toISOString(), sensitive } });
    if (sensitive) await signaler({ type: "intervention", titre: "Message à lire", texte: "Un message délicat vous attend, avec une réponse préparée par l’agent.", chemin: "/messages", etiquette: "messages" });
    return { summary: `Brouillon de réponse préparé${sensitive ? ", cas sensible confié à la créatrice" : ""}`, target: { type: "message", id: messageId, href: "atelier:/messages" } };
  },

  async escalate_message({ messageId, reason }) {
    await updateInbox(messageId, { status: "escalated" });
    await signaler({ type: "intervention", titre: "Message à lire", texte: "Un message vous est confié par le service client.", chemin: "/messages", etiquette: "messages" });
    return { summary: `Message confié à la créatrice : ${reason}`, target: { type: "message", id: messageId, href: "atelier:/messages" } };
  },

  async flag_order({ orderId, reason }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    await setOrderStatus(o.id, "blocked");
    await sendEmail({
      to: atelierEmail(),
      subject: `Commande ${o.number} à vérifier`,
      tag: "alerte",
      ...brandEmail({ preheader: reason, title: `Commande ${o.number} à vérifier`, paragraphs: [reason, `Cliente : ${o.name} (${o.email}). Total : ${formatPrice(o.total)}.`], cta: { label: "Ouvrir le tableau de bord", href: "atelier:/" } }),
    });
    await signaler({ type: "intervention", titre: "Commande à vérifier", texte: `Commande ${o.number}, ${formatPrice(o.total)}, mise de côté pour vérification.`, chemin: `/commandes/${encodeURIComponent(o.number)}`, etiquette: `verifier-${o.number}` });
    return { summary: `Commande ${o.number} signalée : ${reason}`, target: { type: "order", id: o.id, label: o.number, href: "atelier:/commandes" } };
  },

  async alert_atelier({ subject, body }) {
    await sendEmail({ to: atelierEmail(), subject, tag: "alerte", ...brandEmail({ preheader: body.slice(0, 90), title: subject, paragraphs: body.split(/\n{2,}/), cta: { label: "Ouvrir le tableau de bord", href: "atelier:/" } }) });
    return { summary: `Alerte envoyée à l’atelier : ${subject}` };
  },

  async publish_article({ article: a }) {
    const slug = a.slug ? slugify(a.slug) : slugify(a.title);
    const article: Article = {
      slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      date: new Date().toISOString().slice(0, 10),
      readingMinutes: Math.max(2, Math.round(a.sections.flatMap((s) => s.paragraphs).join(" ").split(/\s+/).length / 200)),
      cover: a.cover,
      body: a.sections.flatMap((s) => [...(s.heading ? [{ type: "h2" as const, text: s.heading }] : []), ...s.paragraphs.map((t) => ({ type: "p" as const, text: t }))]),
      seo: a.seo,
    };
    const list = (await kv.get<Article[]>(JOURNAL_KEY)) ?? [];
    await kv.set(JOURNAL_KEY, [article, ...list.filter((x) => x.slug !== slug)]);
    refresh();
    return { summary: `Article publié dans le Journal : « ${a.title} »`, target: { type: "article", id: slug, label: a.title, href: `/journal/${slug}` } };
  },

  async update_ai_visibility({ notes }) {
    await kv.set("ai:llms-notes", { notes, updatedAt: new Date().toISOString() });
    refresh();
    return { summary: `llms.txt et données structurées mis à jour (${notes.length} note(s) d’actualité)`, target: { type: "page", id: "llms", href: "/llms.txt" } };
  },

  async save_content_draft(d) {
    const draft = { id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, date: new Date().toISOString(), status: "draft" as const, ...d };
    await kv.push("content:drafts", draft, 200);
    return { summary: `${d.kind === "instagram" ? "Post Instagram" : "Newsletter"} préparé : « ${d.title} »`, target: { type: "content", id: draft.id, label: d.title, href: "atelier:/contenus" } };
  },

  async send_report({ subject, summary, metrics }) {
    const report = { id: `report-${Date.now().toString(36)}`, date: new Date().toISOString(), subject, summary, metrics };
    await kv.push("reports", report, 104);
    await sendEmail({
      to: process.env.REPORT_EMAIL ?? atelierEmail(),
      subject,
      tag: "rapport",
      ...brandEmail({
        preheader: "Votre semaine à l’atelier, en quelques lignes.",
        title: subject,
        paragraphs: summary.split(/\n{2,}/),
        totals: Object.entries(metrics).map(([label, value]) => ({ label, value: String(value) })),
        cta: { label: "Ouvrir le tableau de bord", href: "atelier:/" },
        signature: "Votre agent Rapport",
      }),
    });
    return { summary: `Rapport hebdomadaire envoyé : ${subject}`, target: { type: "report", id: report.id, href: "atelier:/rapports" } };
  },

  async refund_order({ orderId, reason }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    return rembourserCommande(o, reason, false);
  },

  // même chemin que l'Atelier (Catalogue)
  async change_price({ handle, price }) {
    const p = await lirePiece(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    await updatePiece(handle, { price });
    return { summary: `Prix de ${p.title} : ${formatPrice(p.price)} → ${formatPrice(price)}`, target: { type: "product", id: handle, label: p.title, href: `/boutique/${handle}` } };
  },

  async delete_product({ handle }) {
    const p = await lirePiece(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    {
      const removed = (await kv.get<string[]>(DEMO_KEYS.removed)) ?? [];
      await kv.set(DEMO_KEYS.removed, [...new Set([...removed, handle])]);
    }
    refresh();
    return { summary: `Pièce supprimée : ${p.title}`, target: { type: "product", id: handle, label: p.title } };
  },

  async cancel_order({ orderId, refund }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    if (refund) return rembourserCommande(o, "Commande annulée", true);
    await setOrderStatus(o.id, "blocked");
    return { summary: `Commande ${o.number} annulée`, target: { type: "order", id: o.id, label: o.number, href: "atelier:/commandes" } };
  },

  async send_newsletter_all({ subject, preheader, paragraphs, cta }) {
    const subs = (await kv.get<{ email: string }[]>("newsletter:subscribers")) ?? [];
    for (const s of subs) {
      await sendEmail({ to: s.email, subject, tag: "newsletter", ...brandEmail({ preheader, title: subject, paragraphs, cta, signature: "La Créatrice", footnote: "Vous recevez cette lettre car vous vous êtes inscrite sur awreaparis.com. Désinscription : répondez simplement « stop »." }) });
    }
    return { summary: `Newsletter « ${subject} » envoyée à ${subs.length} abonnée(s)` };
  },

  async send_client_message({ orderId, subject, body }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    const paragraphs = body.split(/\n{2,}/);
    // la formule de fin du message préparé devient la signature de l'e-mail
    const signature = paragraphs.length > 1 && /^avec\b/i.test(paragraphs[paragraphs.length - 1]) ? paragraphs.pop() : undefined;
    await sendEmail({
      to: o.email,
      subject,
      replyTo: atelierEmail(),
      tag: "message-cliente",
      ...brandEmail({ preheader: (paragraphs[1] ?? subject).slice(0, 90), title: subject, paragraphs, cta: { label: "Suivre ma commande", href: "/suivi" }, signature }),
    });
    return { summary: `Message « ${subject} » envoyé à ${o.name} (${o.email})`, target: { type: "order", id: o.id, label: o.number, href: `atelier:/commandes/${o.number}` } };
  },

  // la créatrice confirme la valeur affichée : prix et délai restent les mêmes, seule la mention « provisoire » disparaît
  async confirm_piece_terms({ handle, price, leadTime }) {
    const r = await updatePiece(handle, { ...(price ? { priceProvisional: false } : {}), ...(leadTime ? { leadTimeProvisional: false } : {}) });
    return { summary: r.summary, target: { type: "product", id: handle, label: r.title, href: `/boutique/${handle}` } };
  },

  // un seul message par commande et par retard : l'e-mail « Retard de confection », à l'adresse de la commande
  async notify_delay({ orderId }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    const sujet = `retard:${o.id}`;
    if ((await envoisFaits())[`sujet:${sujet}`]) throw new Error(`${o.name} a déjà été prévenue de ce retard.`);
    await sendDocEmail("email-retard-confection", o.email, {
      vars: { prenom: o.name.trim().split(/\s+/)[0] ?? "", commande: o.number, suivi: absolute(orderLink(o)) },
      replyTo: atelierEmail(),
      tag: "retard-confection",
    });
    await noterEnvoi(o.email, sujet);
    return { summary: `${o.name} prévenue du retard de sa commande ${o.number}`, target: { type: "order", id: o.id, label: o.number, href: `atelier:/commandes/${o.number}` } };
  },

  // seul un avis sans souci est publié sans la créatrice : la règle est revérifiée ici
  async publish_review({ reviewId }) {
    const r = (await listReviews("pending")).find((x) => x.id === reviewId);
    if (!r) throw new Error("Avis introuvable ou déjà lu.");
    if (!avisPublicable(r)) throw new Error("Cet avis signale quelque chose ou porte une photo : il revient à la créatrice.");
    if (!(await moderateReview(r.id, "approved"))) throw new Error("Avis introuvable.");
    try {
      revalidatePath(`/boutique/${r.productHandle}`);
    } catch {
      /* hors contexte de requête */
    }
    return { summary: `Avis de ${r.authorName} publié sur ${r.productHandle}`, target: { type: "review", id: r.id, label: r.authorName, href: "atelier:/avis" } };
  },

  // corrections sans changement de sens, publiées comme une version de la page (annulable dans l'historique)
  async correct_page({ doc, locale }) {
    if (!isDocId(doc) || !isLocale(locale)) throw new Error("Document inconnu.");
    if (editionStorage() !== "stockage") throw new Error("Les corrections se font sur le site en ligne seulement.");
    if (await draftOf(doc, locale)) throw new Error("La page est en cours de modification : elle n’est pas touchée.");
    const live = await publishedDoc(doc, locale);
    if (!live) throw new Error("Document introuvable.");
    const descriptions = Object.fromEntries((await getAllProducts()).flatMap((p) => p.images.filter((i) => i.alt?.trim()).map((i) => [i.src, i.alt])));
    const { value, corrections } = corrigerContenu(live, locale, descriptions);
    if (!corrections.length) return { summary: `Rien à corriger sur « ${doc} »` };
    const note = resumerCorrections(corrections);
    await publishContent(doc, locale, value, "Gardien de l’éditeur", note);
    return { summary: `« ${doc} » (${locale}) : ${note}`, target: { type: "page", id: doc, label: doc, href: "atelier:/pages" } };
  },

  // relances et mots d'accueil : au plus un e-mail par cliente et par semaine, un seul par sujet
  async send_relance({ kind, id }) {
    const cible = await destinataireRelance(kind, id);
    const now = new Date();
    if (!envoiPermis(await envoisFaits(), cible.email, `${kind}:${id}`, now)) throw new Error(`${cible.nom} a déjà reçu un e-mail cette semaine, ou celui-ci : rien n’est envoyé.`);
    await sendDocEmail(cible.document, cible.email, { vars: cible.vars, replyTo: atelierEmail(), tag: `relance-${kind}` });
    await noterEnvoi(cible.email, `${kind}:${id}`, now);
    if (cible.apres) await cible.apres();
    return { summary: `${cible.quoi} envoyé à ${cible.nom}`, target: cible.target };
  },
};

interface Destinataire {
  email: string;
  nom: string;
  quoi: string;
  document: string;
  vars: Record<string, string>;
  target: NonNullable<ActionResult["target"]>;
  apres: (() => Promise<void>) | null;
}

/** Destinataire d'une relance, toujours lu côté serveur (retour, message reçu, fiche cliente). */
async function destinataireRelance(kind: "retour" | "sur-mesure" | "cercle", id: string): Promise<Destinataire> {
  const prenom = (nom: string | null | undefined) => (nom ?? "").trim().split(/\s+/)[0] ?? "";
  if (kind === "retour") {
    const r = await getReturn(id);
    if (!r || r.status !== "demande") throw new Error("Retour introuvable ou déjà reçu.");
    const o = await getOrder(r.orderId);
    return {
      email: r.email,
      nom: r.name,
      quoi: `Rappel du retour ${r.id}`,
      document: "email-relance-retour",
      vars: { prenom: prenom(r.name), commande: r.orderNumber, retour: r.id, suivi: o ? absolute(orderLink(o)) : absolute("/suivi") },
      target: { type: "return", id: r.id, label: r.id, href: "atelier:/retours" },
      apres: null,
    };
  }
  if (kind === "sur-mesure") {
    const m = (await listInbox(500)).find((x) => x.id === id);
    if (!m) throw new Error("Demande introuvable.");
    return {
      email: m.email,
      nom: m.name,
      quoi: "Accusé de la demande de sur mesure",
      document: "email-accuse-sur-mesure",
      vars: { prenom: prenom(m.name), rendezvous: absolute("/rendez-vous?type=sur-mesure") },
      target: { type: "message", id: m.id, label: m.name, href: "atelier:/messages" },
      apres: null,
    };
  }
  const c = (await listCustomerStats()).find((x) => x.id === id);
  if (!c) throw new Error("Cliente introuvable.");
  if (c.cercleMember) throw new Error("Cette cliente est déjà dans le Cercle.");
  return {
    email: c.email,
    nom: c.firstName ?? c.email,
    quoi: "Mot de bienvenue du Cercle",
    document: "email-bienvenue-cercle",
    vars: { prenom: c.firstName ?? "" },
    target: { type: "customer", id: c.id, label: c.firstName ?? c.email, href: "atelier:/clientes" },
    apres: async () => {
      await updateProfile({ id: c.id, email: c.email }, { cercleMember: true });
    },
  };
}

export async function allProductsBrief() {
  return (await getAllProducts()).map((p) => ({ handle: p.handle, title: p.title, price: p.price, collection: p.collection }));
}
