/**
 * E-mails automatiques de la Maison, au gabarit Awrea Paris.
 *
 * Chaque pièce est créée sur demande par des artisans français : aucun e-mail ne parle de stock,
 * de quantité, de rareté ni d'urgence, et aucun ne promet de remise.
 *
 * | Scénario           | Déclencheur                                              | Condition                                   |
 * |--------------------|----------------------------------------------------------|---------------------------------------------|
 * | Bienvenue          | création du compte, ou inscription à la lettre           | envoi immédiat, une seule fois              |
 * | Avant-première     | collection annoncée sur « Bientôt », lettre choisie par  | lettre acceptée ; une fois par collection   |
 * |                    | la créatrice dans l'Atelier                               | et par inscrite, jusqu'au dévoilement       |
 * | Livraison          | étape « Livrée »                                         | relation contractuelle                      |
 * | Après la livraison | deux jours après : merci, certificat, entretien connu    | relation contractuelle                      |
 * | Demande d'avis     | 14 jours après la livraison                              | relation contractuelle, opposable           |
 * | Panier en attente  | panier d'une cliente connectée inchangé depuis 4 h       | personnalisation et lettre ; une relance    |
 *
 * Les étapes d'une commande « Commande reçue », « En confection », « Prête » et « Expédiée » ont
 * leurs propres e-mails, modifiables dans l'Atelier (lib/email/commandes.ts) : ce module n'en
 * envoie aucun en double. `onOrderShipped` (webhook d'expédition de Shopify) passe par eux.
 * Les scénarios planifiés passent par `runDailyFlows()` (tâche quotidienne). Chaque envoi est
 * mémorisé pour ne jamais être répété ; chaque lettre porte son lien de désinscription.
 */
import "server-only";
import { reviewToken } from "@/lib/reviews";
import { identity } from "@/content/brand/identity";
import { brandEmail } from "@/lib/email/templates";
import { absolute } from "@/lib/seo/metadata";
import { kv } from "@/lib/store";
import { getOrders } from "@/lib/commerce/orders";
import { orderLink } from "@/lib/commerce/order-access";
import { getProduct } from "@/lib/commerce";
import { sendOrderStageEmail } from "@/lib/email/commandes";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { fill } from "@/lib/edition/fill";
import { readDoc } from "@/lib/edition/store";
import { accessLinkToken, accessSeconds, dropPhase, dropVars, listDrops, recordDropLetters, type Drop } from "@/lib/drops";
import type { AvantPremieresTexts } from "@/components/drops/regles";
import type { Order } from "@/lib/commerce/types";
import type { CustomerProfile } from "@/lib/customers/types";
import { unsubscribeHeaders, unsubscribePage } from "./unsubscribe";
import { sendFlowEmail, trackEvent, upsertContact } from "./provider";

export type FlowId = "bienvenue" | "avant-premiere" | "livraison" | "apres-achat" | "avis" | "panier";

export const flowCatalog: { id: FlowId; label: string; trigger: string; condition: string }[] = [
  { id: "bienvenue", label: "Bienvenue", trigger: "Création du compte ou inscription à la lettre", condition: "Envoi immédiat, une seule fois" },
  { id: "avant-premiere", label: "Avant-première", trigger: "Collection annoncée sur la page « Bientôt »", condition: "Choisi par la créatrice ; une lettre par collection et par inscrite" },
  { id: "livraison", label: "Livraison", trigger: "Étape « Livrée »", condition: "Certificat, retours et échanges" },
  { id: "apres-achat", label: "Après la livraison", trigger: "Deux jours après la livraison", condition: "Merci et entretien de chaque pièce, quand il est connu" },
  { id: "avis", label: "Demande d’avis", trigger: "14 jours après la livraison", condition: "Avis vérifié, une seule demande" },
  { id: "panier", label: "Panier en attente", trigger: "Panier inchangé depuis 4 heures", condition: "Personnalisation et lettre acceptées ; une seule relance, sans urgence ni remise" },
];

const SIGNATURE = "Avec toute notre attention,\nla Maison Awrea Paris";
const greet = (firstName?: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,");
/** Une lettre (consentement aux e-mails de la Maison) : lien de désinscription visible et en un clic. */
const unsubscribeNote = (email: string) => `Pour ne plus recevoir la lettre de la Maison, un clic suffit : ${unsubscribePage(email)}`;

/** Un envoi par clé : jamais deux fois le même e-mail pour le même évènement. */
async function once(flow: FlowId, key: string, send: () => Promise<void>): Promise<boolean> {
  const k = `flows:sent:${flow}:${key}`;
  if (await kv.get(k)) return false;
  await send();
  await kv.set(k, new Date().toISOString());
  return true;
}

// ------------------------------------------------------------------ bienvenue
export async function onCustomerCreated(p: CustomerProfile) {
  await upsertContact({ email: p.email, firstName: p.firstName, lastName: p.lastName, locale: p.locale, marketing: p.marketingEmail, segment: "nouvelle", cercle: p.cercleMember, birthday: p.birthday }).catch((e) =>
    console.error("[flows] contact", e),
  );
  await trackEvent(p.email, "Compte créé").catch(() => {});
  await once("bienvenue", p.email.toLowerCase(), async () => {
    const mail = brandEmail({
      preheader: "Votre compte Awrea Paris est ouvert.",
      title: "Bienvenue chez Awrea Paris",
      paragraphs: [
        greet(p.firstName),
        "Votre compte est ouvert. Vous y suivez vos commandes, étape par étape, de la confection à la livraison. Vous y gardez aussi les certificats de vos pièces, vos tailles et vos envies.",
        "Chaque pièce de la Maison est créée sur demande par des artisans français. Aucune n’attend sur une étagère : votre commande lance sa confection.",
      ],
      cta: { label: "Voir les collections", href: absolute("/collections") },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: p.email, subject: "Bienvenue chez Awrea Paris", ...mail, flow: "bienvenue" });
  });
}

export async function onNewsletterSignup(email: string) {
  await once("bienvenue", email.toLowerCase(), async () => {
    const mail = brandEmail({
      preheader: "La lettre de la Maison commence ici.",
      title: "La lettre de la Maison",
      paragraphs: [
        "Bonjour,",
        "Merci de nous rejoindre. Quelques fois par saison, la Maison vous écrit : une collection qui se prépare à l’atelier, une dentelle choisie, les coulisses d’une séance photo.",
        "Vous voyez chaque nouvelle collection avant tout le monde, et vous commandez ses pièces en avant-première. Jamais d’urgence, jamais de bruit.",
      ],
      cta: { label: "Entrer dans l’atelier", href: absolute("/atelier") },
      signature: SIGNATURE,
      footnote: unsubscribeNote(email),
    });
    await sendFlowEmail({ to: email, subject: "La lettre de la Maison", ...mail, headers: unsubscribeHeaders(email), flow: "bienvenue" });
  });
}

// ------------------------------------------------------------------ avant-première d'une collection
/** Inscrites à la lettre : la liste de la Maison, et les clientes qui l'ont acceptée dans leur compte. */
async function letterRecipients(): Promise<string[]> {
  const list = (await kv.get<{ email: string }[]>("newsletter:subscribers")) ?? [];
  const all = new Set(list.map((s) => s.email.trim().toLowerCase()));
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin().from("customers").select("email").eq("marketing_email", true).limit(20_000);
    for (const c of (data ?? []) as { email: string | null }[]) if (c.email) all.add(c.email.trim().toLowerCase());
  }
  return [...all].filter((e) => e.includes("@"));
}

/** Au plus tant de lettres par passage : les suivantes partent au passage suivant (tâche quotidienne). */
const LETTERS_PER_RUN = 2000;

/**
 * Lettre d'avant-première (textes : avant-premieres.json, emails.lettre) : chaque inscrite reçoit
 * une fois son lien personnel vers la collection annoncée. Seulement si la créatrice l'a choisi
 * dans l'Atelier, jamais pour une présentation privée ni après le dévoilement. Renvoie le nombre
 * de lettres parties.
 */
export async function sendDropLetters(drop: Drop, now = Date.now()): Promise<number> {
  if (!drop.notifyLetters || drop.privateSale || dropPhase(drop, now) === "ouvert") return 0;
  const t = (await readDoc("avant-premieres", "fr")) as AvantPremieresTexts | null;
  if (!t) throw new Error("textes des avant-premières introuvables");
  const m = t.emails.lettre;
  const vars = dropVars(t, drop);
  const seconds = accessSeconds(drop, now);
  let sent = 0;
  for (const email of await letterRecipients()) {
    if (sent >= LETTERS_PER_RUN) break;
    const done = await once("avant-premiere", `${drop.slug}:${email}`, async () => {
      const link = absolute(`/bientot/${drop.slug}/acces?t=${encodeURIComponent(accessLinkToken(drop.slug, email, seconds))}`);
      const mail = brandEmail({
        preheader: fill(m.preheader, vars),
        title: fill(m.titre, vars),
        paragraphs: m.paragraphes.map((p) => fill(p, vars)),
        cta: { label: m.bouton, href: link },
        signature: m.signature,
        footnote: fill(m.note, { desinscription: unsubscribePage(email) }),
      });
      await sendFlowEmail({ to: email, subject: fill(m.objet, vars), ...mail, headers: unsubscribeHeaders(email), flow: "avant-premiere" });
    }).catch((e) => {
      console.error("[flows] avant-première", e);
      return false;
    });
    if (done) sent++;
  }
  await recordDropLetters(drop.slug, sent);
  return sent;
}

// ------------------------------------------------------------------ suivi de la commande
/**
 * Commande remise au transporteur (webhook d'expédition de Shopify) : l'e-mail de l'étape
 * « Expédiée » (lib/email/commandes.ts), qui ne part qu'une fois par commande, même si l'Atelier a
 * déjà consigné l'étape.
 */
export async function onOrderShipped(order: Order) {
  await sendOrderStageEmail(order, "shipped");
}

/** Étape « Livrée » : mot d'arrivée (certificat, retours) ; le merci et l'entretien suivent deux jours plus tard. */
export async function onOrderDelivered(order: Order) {
  await kv.set(`flows:delivered:${order.id}`, order.deliveredAt ?? new Date().toISOString());
  await once("livraison", order.id, async () => {
    const mail = brandEmail({
      preheader: "Votre pièce est arrivée.",
      title: "Votre pièce est arrivée",
      paragraphs: [
        greet(order.name.split(" ")[0]),
        "Votre colis vient d’être livré. Votre pièce a été confectionnée pour vous, sur demande, par des artisans français. Nous espérons qu’elle tombe juste dès le premier essayage.",
        "Son certificat d’authenticité vous attend en ligne. Si la pièce ne vous convient pas, la page Livraison et retours vous explique comment nous la renvoyer.",
      ],
      cta: { label: "Retrouver mon certificat", href: absolute(orderLink(order)) },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: order.email, subject: "Votre pièce est arrivée", ...mail, flow: "livraison" });
  });
}

/** Un conseil d'entretien réel, jamais un champ encore à compléter par la Maison. */
const knownCare = (lines: string[]) => lines.filter((l) => l.trim() && !/\[À COMPLÉTER/i.test(l));

/** Merci et entretien (deux jours après la livraison, tâche quotidienne). */
async function sendAfterPurchase(order: Order) {
  await once("apres-achat", order.id, async () => {
    const products = await Promise.all(order.lines.map((l) => getProduct(l.handle).catch(() => null)));
    const care = products.flatMap((p, i) => {
      const known = p ? knownCare(p.care) : [];
      return known.length ? [`${order.lines[i].title}. ${known.join(" ")}`] : [];
    });
    const mail = brandEmail({
      preheader: "Quelques mots de la Maison, après votre livraison.",
      title: "Prendre soin de votre pièce",
      paragraphs: [
        greet(order.name.split(" ")[0]),
        "Votre pièce vit chez vous depuis quelques jours. Elle a été confectionnée pour vous par des artisans français, et quelques gestes simples l’aideront à traverser les années.",
        ...care,
        `Pour toute question d’entretien, la Maison vous conseille volontiers : écrivez-nous à ${identity.email}. Le certificat d’authenticité de votre pièce vous attend dans votre compte.`,
      ],
      cta: { label: "Retrouver mes certificats", href: absolute("/compte") },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: order.email, subject: "Prendre soin de votre pièce", ...mail, flow: "apres-achat" });
  });
}

// ------------------------------------------------------------------ tâche quotidienne
type DailyReport = Record<FlowId, number>;

export async function runDailyFlows(now = new Date()): Promise<DailyReport> {
  const report: DailyReport = { bienvenue: 0, "avant-premiere": 0, livraison: 0, "apres-achat": 0, avis: 0, panier: 0 };
  const day = 24 * 60 * 60 * 1000;

  // avant-premières : les inscrites arrivées depuis l'annonce reçoivent aussi leur lien
  for (const d of await listDrops()) {
    report["avant-premiere"] += await sendDropLetters(d, now.getTime()).catch((e) => {
      console.error("[flows] avant-première", e);
      return 0;
    });
  }

  // après la livraison : merci et entretien à 2 jours, demande d'avis à 14 jours
  const orders = await getOrders();
  for (const o of orders) {
    if (o.status !== "delivered") continue;
    const seen = await kv.get<string>(`flows:delivered:${o.id}`);
    const deliveredAt = new Date(o.deliveredAt ?? seen ?? new Date(new Date(o.createdAt).getTime() + 4 * day).toISOString()).getTime();
    const since = now.getTime() - deliveredAt;
    if (since >= 2 * day && since <= 30 * day && !(await kv.get(`flows:sent:apres-achat:${o.id}`))) {
      await sendAfterPurchase(o);
      report["apres-achat"]++;
    }
    if (since < 14 * day || since > 30 * day) continue;
    const sent = await once("avis", o.id, () => sendReviewRequest(o));
    if (sent) report.avis++;
  }

  if (isSupabaseConfigured) {
    const db = supabaseAdmin();
    // panier en attente (personnalisation et lettre acceptées) : une seule relance, sans urgence ni remise
    const since = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const { data: carts } = await db
      .from("carts")
      .select("customer_id, lines, subtotal, updated_at, customers!inner(email, first_name, marketing_email, personalization)")
      .lt("updated_at", since)
      .is("reminded_at", null)
      .limit(200);
    for (const c of (carts ?? []) as unknown as { customer_id: string; lines: { title: string; size: string; unitPrice: number; handle: string }[]; customers: { email: string; first_name: string | null; marketing_email: boolean; personalization: boolean } }[]) {
      if (!c.customers.marketing_email || !c.customers.personalization || !c.lines.length) continue;
      const single = new Set(c.lines.map((l) => l.handle)).size === 1;
      const mail = brandEmail({
        preheader: "Votre sélection vous attend, prenez votre temps.",
        title: "Votre sélection vous attend",
        paragraphs: [
          greet(c.customers.first_name),
          "Vous avez laissé quelques pièces dans votre panier. Elles vous attendent, sans aucune obligation.",
          "Chaque pièce est créée sur demande par des artisans français, une fois votre commande passée : rien ne presse. Pour une question de taille ou de tombé, la Maison vous répond volontiers.",
        ],
        items: c.lines.map((l) => ({ title: l.title, meta: `Taille ${l.size}`, price: l.unitPrice })),
        cta: single ? { label: "Revoir la pièce", href: absolute(`/boutique/${c.lines[0].handle}`) } : { label: "Revoir les pièces", href: absolute("/boutique") },
        signature: SIGNATURE,
        footnote: unsubscribeNote(c.customers.email),
      });
      await sendFlowEmail({ to: c.customers.email, subject: "Votre sélection vous attend", ...mail, headers: unsubscribeHeaders(c.customers.email), flow: "panier" });
      await db.from("carts").update({ reminded_at: now.toISOString() }).eq("customer_id", c.customer_id);
      report.panier++;
    }
  }
  await kv.push("flows:runs", { at: now.toISOString(), report }, 120);
  return report;
}

export const contactEmail = identity.email;

/** Demande d'avis (flux du 14e jour après la livraison, ou envoi manuel depuis l'Atelier). */
export async function sendReviewRequest(o: Order) {
  const mail = brandEmail({
    preheader: "Votre regard compte pour la Maison.",
    title: "Comment la portez-vous ?",
    paragraphs: [
      greet(o.name.split(" ")[0]),
      "Votre pièce vous accompagne depuis quelques jours. Nous aimerions savoir comment elle tombe, ce que vous ressentez en la portant, et si la taille vous a semblé juste.",
      "Votre avis, vérifié et publié avec votre prénom seulement, aide d’autres femmes à choisir. Une photo est bienvenue, jamais obligatoire.",
    ],
    cta: { label: "Donner mon avis", href: absolute(`/avis/${encodeURIComponent(o.number)}?t=${encodeURIComponent(reviewToken(o))}`) },
    signature: SIGNATURE,
    footnote: "Pour ne plus recevoir de demande d’avis, répondez simplement à ce message.",
  });
  await sendFlowEmail({ to: o.email, subject: "Comment la portez-vous ?", ...mail, flow: "avis" });
}
