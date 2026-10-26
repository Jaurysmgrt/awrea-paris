/**
 * Exécuteurs des actions des agents. Chaque action a un schéma de paramètres (validé)
 * et une exécution : Shopify Admin quand il est configuré, données de démonstration sinon.
 *
 * Modèle « sur demande » : aucune action ne touche à un stock ni à une liste d'attente. Les prix,
 * délais et indicateurs « provisoire » passent par lib/commerce/pieces.ts, comme dans l'Atelier.
 */
import * as z from "zod/v4";
import { revalidatePath } from "next/cache";
import { kv } from "@/lib/store";
import { DEMO_KEYS } from "@/lib/commerce/catalog-demo";
import { getAllProducts, getProduct } from "@/lib/commerce";
import { getOrder, setOrderStatus } from "@/lib/commerce/orders";
import type { Product } from "@/lib/commerce/types";
import {
  adminEnabled,
  PIECE_METAFIELDS,
  shopifyCancelOrder,
  shopifyCreateProduct,
  shopifyDeleteProduct,
  shopifyRefundOrder,
  shopifyUpdateProduct,
} from "@/lib/shopify/admin";
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
  status: z.enum(["active", "draft"]).default("active"),
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
} satisfies Record<ActionType, z.ZodType>;

export type ActionParams<T extends ActionType> = z.infer<(typeof ACTION_SCHEMAS)[T]>;

export interface ActionResult {
  summary: string;
  target?: { type: string; id: string; label?: string; href?: string };
}

/* ---------------------------------------------------------------- EXÉCUTION */

export const EXECUTORS: { [T in ActionType]: (params: ActionParams<T>) => Promise<ActionResult> } = {
  async publish_product({ product: d }) {
    const handle = d.handle ? slugify(d.handle) : slugify(d.title);
    const existing = await getProduct(handle);
    if (existing) throw new Error(`Une pièce existe déjà sous l’adresse /boutique/${handle}.`);
    const code = d.title.split(" ").pop()!.slice(0, 3).toUpperCase();
    const leadTime = d.lead_time && d.lead_time.min <= d.lead_time.max ? d.lead_time : DEFAULT_LEAD_TIME[d.category];
    if (adminEnabled) {
      await shopifyCreateProduct({
        handle,
        title: d.title,
        descriptionHtml: d.description.map((p) => `<p>${p}</p>`).join(""),
        productType: d.category,
        tags: d.tags,
        status: d.status === "active" ? "ACTIVE" : "DRAFT",
        seo: d.seo,
        metafields: [
          { key: "tagline", type: "single_line_text_field", value: d.tagline },
          { ...PIECE_METAFIELDS.leadTimeMin, value: String(leadTime.min) },
          { ...PIECE_METAFIELDS.leadTimeMax, value: String(leadTime.max) },
          { ...PIECE_METAFIELDS.priceProvisional, value: String(d.price_provisional) },
          { ...PIECE_METAFIELDS.leadTimeProvisional, value: String(d.lead_time_provisional) },
          { ...PIECE_METAFIELDS.isNew, value: "true" },
          { key: "materials", type: "json", value: JSON.stringify(d.materials) },
          { key: "care", type: "list.single_line_text_field", value: JSON.stringify(d.care) },
          { key: "fit", type: "multi_line_text_field", value: d.fit },
          { key: "model", type: "single_line_text_field", value: d.model || "La taille portée sur les photos reste à préciser par l’atelier." },
          { key: "details", type: "list.single_line_text_field", value: JSON.stringify(d.details.length ? d.details : ["Créée sur demande par des artisans français"]) },
        ],
        images: d.images.map((i) => ({ url: i.src.startsWith("http") ? i.src : `${identity.url}${i.src}`, alt: i.alt })),
        sizes: d.sizes.map((size) => ({ size, sku: `AW-${code}-${size}` })),
        price: d.price,
      });
    } else {
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
      if (d.status === "draft") {
        await kv.push("demo:products:drafts", product, 100);
        return { summary: `Fiche « ${d.title} » enregistrée en brouillon (non visible en boutique)`, target: { type: "product", id: handle, label: d.title, href: "atelier:/catalogue" } };
      }
      const extra = (await kv.get<Product[]>(DEMO_KEYS.extra)) ?? [];
      await kv.set(DEMO_KEYS.extra, [...extra, product]);
    }
    refresh();
    return { summary: `Fiche « ${d.title} » publiée (${formatPrice(d.price)}, créée sur demande en ${leadTime.min} à ${leadTime.max} semaines)`, target: { type: "product", id: handle, label: d.title, href: `/boutique/${handle}` } };
  },

  async update_product_content({ handle, tagline, description, seo, alts }) {
    const p = await getProduct(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    if (adminEnabled) {
      await shopifyUpdateProduct(handle, { descriptionHtml: description?.map((x) => `<p>${x}</p>`).join(""), seo });
    } else {
      const patches = (await kv.get<Record<string, Partial<Product>>>(DEMO_KEYS.patches)) ?? {};
      const images = alts?.length ? p.images.map((im, i) => ({ ...im, alt: alts.find((a) => a.index === i)?.alt ?? im.alt })) : undefined;
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
    return { summary: `Brouillon de réponse préparé${sensitive ? ", cas sensible confié à la créatrice" : ""}`, target: { type: "message", id: messageId, href: "atelier:/messages" } };
  },

  async escalate_message({ messageId, reason }) {
    await updateInbox(messageId, { status: "escalated" });
    return { summary: `Message confié à la créatrice : ${reason}`, target: { type: "message", id: messageId, href: "atelier:/messages" } };
  },

  async flag_order({ orderId, reason }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    if (!adminEnabled) await setOrderStatus(o.id, "blocked");
    await sendEmail({
      to: atelierEmail(),
      subject: `Commande ${o.number} à vérifier`,
      tag: "alerte",
      ...brandEmail({ preheader: reason, title: `Commande ${o.number} à vérifier`, paragraphs: [reason, `Cliente : ${o.name} (${o.email}). Total : ${formatPrice(o.total)}.`], cta: { label: "Ouvrir le tableau de bord", href: "atelier:/" } }),
    });
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
    if (adminEnabled) await shopifyRefundOrder(o.id, reason);
    else await setOrderStatus(o.id, "refunded");
    await sendEmail({
      to: o.email,
      subject: `Remboursement de votre commande ${o.number}`,
      tag: "remboursement",
      ...brandEmail({ preheader: "Votre remboursement est en cours.", title: "Votre remboursement", paragraphs: [`Bonjour ${o.name.split(" ")[0]},`, `Votre commande ${o.number} vous est remboursée : ${formatPrice(o.total)}, sur le moyen de paiement utilisé lors de l’achat. La somme apparaît sur votre relevé d’ici quelques jours.`], signature: "Avec toute notre attention,\nl’atelier Awrea Paris" }),
    });
    return { summary: `Commande ${o.number} remboursée (${formatPrice(o.total)})`, target: { type: "order", id: o.id, label: o.number, href: "atelier:/commandes" } };
  },

  // même chemin que l'Atelier (Catalogue) : une pièce Shopify aux prix différents selon la taille garde ses prix
  async change_price({ handle, price }) {
    const p = await getProduct(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    await updatePiece(handle, { price });
    return { summary: `Prix de ${p.title} : ${formatPrice(p.price)} → ${formatPrice(price)}`, target: { type: "product", id: handle, label: p.title, href: `/boutique/${handle}` } };
  },

  async delete_product({ handle }) {
    const p = await getProduct(handle);
    if (!p) throw new Error(`Pièce ${handle} introuvable`);
    if (adminEnabled) await shopifyDeleteProduct(handle);
    else {
      const removed = (await kv.get<string[]>(DEMO_KEYS.removed)) ?? [];
      await kv.set(DEMO_KEYS.removed, [...new Set([...removed, handle])]);
    }
    refresh();
    return { summary: `Pièce supprimée : ${p.title}`, target: { type: "product", id: handle, label: p.title } };
  },

  async cancel_order({ orderId, refund }) {
    const o = await getOrder(orderId);
    if (!o) throw new Error("Commande introuvable");
    if (adminEnabled) await shopifyCancelOrder(o.id, refund);
    else await setOrderStatus(o.id, refund ? "refunded" : "blocked");
    return { summary: `Commande ${o.number} annulée${refund ? " et remboursée" : ""}`, target: { type: "order", id: o.id, label: o.number, href: "atelier:/commandes" } };
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
};

export async function allProductsBrief() {
  return (await getAllProducts()).map((p) => ({ handle: p.handle, title: p.title, price: p.price, collection: p.collection }));
}
