/**
 * E-mails automatiques de la maison, au gabarit Awrea Paris.
 *
 * | Scénario            | Déclencheur                                        | Condition                         |
 * |---------------------|----------------------------------------------------|-----------------------------------|
 * | Expédition          | commande remise au transporteur (lien de suivi)    | relation contractuelle            |
 * | Livraison           | commande livrée                                    | relation contractuelle            |
 * | Bienvenue           | création du compte / inscription aux lettres       | —                                 |
 * | Panier abandonné    | panier d'une cliente connectée inchangé depuis 4 h | personnalisation + lettres        |
 * | Après l'achat       | 2 jours après la livraison : merci et entretien    | relation contractuelle            |
 * | Demande d'avis      | 14 jours après la livraison                        | relation contractuelle, opposable |
 * | Retour en stock     | pièce attendue de nouveau disponible               | inscription à la liste d'attente  |
 * | Anniversaire        | le jour J, si la date est renseignée               | lettres                           |
 * | Réactivation        | ni commande ni visite depuis 6 mois                | lettres, une fois par an au plus  |
 *
 * Le retour en stock est envoyé par l'agent « Commandes et stock » (action notify_waitlist).
 * Les autres scénarios planifiés passent par `runDailyFlows()` (tâche quotidienne).
 * Chaque envoi est mémorisé pour ne jamais être répété.
 */
import { reviewToken } from "@/lib/reviews";
import "server-only";
import { identity } from "@/content/brand/identity";
import { brandEmail } from "@/lib/email/templates";
import { absolute } from "@/lib/seo/metadata";
import { kv } from "@/lib/store";
import { getOrders, trackingUrl } from "@/lib/commerce/orders";
import { orderLink } from "@/lib/commerce/order-access";
import { getProduct } from "@/lib/commerce";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import type { Order } from "@/lib/commerce/types";
import type { CustomerProfile } from "@/lib/customers/types";
import { sendFlowEmail, trackEvent, upsertContact } from "./provider";

export type FlowId = "expedition" | "livraison" | "bienvenue" | "panier" | "apres-achat" | "avis" | "retour-stock" | "anniversaire" | "reactivation";

export const flowCatalog: { id: FlowId; label: string; trigger: string; condition: string }[] = [
  { id: "expedition", label: "Expédition", trigger: "Commande remise au transporteur", condition: "Lien de suivi du colis" },
  { id: "livraison", label: "Livraison", trigger: "Commande livrée", condition: "Certificat, retours et échanges" },
  { id: "bienvenue", label: "Bienvenue", trigger: "Création du compte ou inscription aux lettres", condition: "Envoi immédiat" },
  { id: "panier", label: "Panier abandonné", trigger: "Panier inchangé depuis 4 heures", condition: "Personnalisation et lettres acceptées ; une seule relance" },
  { id: "apres-achat", label: "Après l’achat", trigger: "Deux jours après la livraison", condition: "Merci et conseils d’entretien de chaque pièce" },
  { id: "avis", label: "Demande d’avis", trigger: "14 jours après la livraison", condition: "Avis vérifié, une seule demande" },
  { id: "retour-stock", label: "Retour en stock", trigger: "Pièce de nouveau disponible", condition: "Inscription à la liste d’attente (agent Commandes et stock)" },
  { id: "anniversaire", label: "Anniversaire", trigger: "Le jour de l’anniversaire", condition: "Date renseignée et lettres acceptées" },
  { id: "reactivation", label: "Réactivation", trigger: "Six mois sans commande ni visite", condition: "Lettres acceptées ; une fois par an au plus" },
];

const SIGNATURE = "Avec toute notre attention, l’atelier Awrea Paris.";
const greet = (firstName?: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,");

/** Un envoi par clé : jamais deux fois le même e-mail pour le même évènement. */
async function once(flow: FlowId, key: string, send: () => Promise<void>): Promise<boolean> {
  const k = `flows:sent:${flow}:${key}`;
  if (await kv.get(k)) return false;
  await send();
  await kv.set(k, new Date().toISOString());
  return true;
}

// ------------------------------------------------------------------ déclencheurs immédiats
export async function onCustomerCreated(p: CustomerProfile) {
  await upsertContact({ email: p.email, firstName: p.firstName, lastName: p.lastName, locale: p.locale, marketing: p.marketingEmail, segment: "nouvelle", cercle: p.cercleMember, birthday: p.birthday }).catch((e) =>
    console.error("[flows] contact", e),
  );
  await trackEvent(p.email, "Compte créé").catch(() => {});
  await once("bienvenue", p.email.toLowerCase(), async () => {
    const mail = brandEmail({
      preheader: "Votre compte Awrea Paris est prêt.",
      title: "Bienvenue chez Awrea Paris",
      paragraphs: [
        greet(p.firstName),
        "Votre compte est ouvert. Vous y retrouverez vos commandes, les certificats de vos pièces, vos tailles et les créations que vous gardez de côté.",
        "Chaque pièce naît à la main, dans notre atelier parisien, en série courte et numérotée. Nous serons heureuses de vous accompagner, d’un conseil de taille à un essayage à l’atelier.",
      ],
      cta: { label: "Découvrir la collection", href: absolute("/collections") },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: p.email, subject: "Bienvenue chez Awrea Paris", ...mail, flow: "bienvenue" });
  });
}

export async function onNewsletterSignup(email: string) {
  await once("bienvenue", email.toLowerCase(), async () => {
    const mail = brandEmail({
      preheader: "Les lettres de l’atelier commencent ici.",
      title: "Les lettres de l’atelier",
      paragraphs: [
        "Bonjour,",
        "Merci de nous rejoindre. Quelques fois par saison, nous vous écrirons : une nouvelle pièce qui sort de l’atelier, les coulisses d’un shooting, l’ouverture d’une vente.",
        "Jamais d’urgence, jamais de bruit. Seulement ce qui mérite d’être raconté.",
      ],
      cta: { label: "Entrer dans l’atelier", href: absolute("/atelier") },
      signature: SIGNATURE,
      footnote: "Vous pouvez vous désinscrire à tout moment grâce au lien présent dans chacune de nos lettres.",
    });
    await sendFlowEmail({ to: email, subject: "Les lettres de l’atelier", ...mail, flow: "bienvenue" });
  });
}

/** Commande livrée : conseils d'entretien de chaque pièce reçue. */
/** Commande remise au transporteur : le lien de suivi, et celui de la commande. */
export async function onOrderShipped(order: Order) {
  await once("expedition", order.id, async () => {
    const url = trackingUrl(order.shipping.carrier, order.shipping.tracking);
    const mail = brandEmail({
      preheader: "Votre pièce a quitté l’atelier.",
      title: "Votre pièce est en route",
      paragraphs: [
        greet(order.name.split(" ")[0]),
        "Votre pièce a quitté l’atelier ce matin, pliée dans son papier de soie, avec son certificat.",
        order.shipping.relay
          ? `Elle vous attendra au point relais ${order.shipping.relay.name} (${order.shipping.relay.address}).`
          : url
            ? `Vous pouvez suivre son voyage avec ${order.shipping.carrier} : numéro ${order.shipping.tracking}.`
            : "Vous recevrez le numéro de suivi du transporteur dès sa prise en charge.",
      ],
      cta: url ? { label: "Suivre le colis", href: url } : { label: "Suivre ma commande", href: absolute(orderLink(order)) },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: order.email, subject: "Votre pièce est en route", ...mail, flow: "expedition" });
  });
}

/** Commande livrée : mot d'arrivée (certificat, retours) ; le merci et l'entretien suivent deux jours plus tard. */
export async function onOrderDelivered(order: Order) {
  await kv.set(`flows:delivered:${order.id}`, order.deliveredAt ?? new Date().toISOString());
  await once("livraison", order.id, async () => {
    const mail = brandEmail({
      preheader: "Votre pièce est arrivée.",
      title: "Votre pièce est arrivée",
      paragraphs: [
        greet(order.name.split(" ")[0]),
        "Votre colis vient d’être livré. Nous espérons que la pièce vous ressemble dès le premier essayage.",
        "Son certificat d’authenticité est en ligne. Si la taille ne tombe pas juste, un échange ou un retour se demande en quelques gestes, jusqu’à quatorze jours après la livraison.",
      ],
      cta: { label: "Ma commande, mon certificat", href: absolute(orderLink(order)) },
      signature: SIGNATURE,
    });
    await sendFlowEmail({ to: order.email, subject: "Votre pièce est arrivée", ...mail, flow: "livraison" });
  });
}

/** Merci et conseils d'entretien (deux jours après la livraison, tâche quotidienne). */
async function sendAfterPurchase(order: Order) {
  await once("apres-achat", order.id, async () => {
    const products = await Promise.all(order.lines.map((l) => getProduct(l.handle)));
    const care = products.flatMap((p, i) => (p ? [`${order.lines[i].title} — ${p.care.join(" ")}`] : []));
    const mail = brandEmail({
      preheader: "Quelques gestes pour que votre pièce traverse les années.",
      title: "Prendre soin de votre pièce",
      paragraphs: [
        greet(order.name.split(" ")[0]),
        "Votre pièce est arrivée chez vous. Elle a été façonnée à la main, fil après fil : quelques gestes simples lui permettront de traverser les années.",
        ...care,
        "Rangez-la à plat ou sur un cintre large, à l’abri de la lumière directe. Son certificat d’authenticité vous attend dans votre compte.",
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
  const report: DailyReport = { expedition: 0, livraison: 0, bienvenue: 0, panier: 0, "apres-achat": 0, avis: 0, "retour-stock": 0, anniversaire: 0, reactivation: 0 };
  const day = 24 * 60 * 60 * 1000;

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
    // paniers abandonnés (personnalisation + lettres)
    const since = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const { data: carts } = await db
      .from("carts")
      .select("customer_id, lines, subtotal, updated_at, customers!inner(email, first_name, marketing_email, personalization)")
      .lt("updated_at", since)
      .is("reminded_at", null)
      .limit(200);
    for (const c of (carts ?? []) as unknown as { customer_id: string; lines: { title: string; size: string; unitPrice: number; handle: string }[]; customers: { email: string; first_name: string | null; marketing_email: boolean; personalization: boolean } }[]) {
      if (!c.customers.marketing_email || !c.customers.personalization || !c.lines.length) continue;
      const mail = brandEmail({
        preheader: "Votre sélection vous attend à l’atelier.",
        title: "Votre sélection vous attend",
        paragraphs: [
          greet(c.customers.first_name),
          "Vous avez laissé quelques pièces dans votre panier. Elles vous attendent, sans aucune obligation : nos séries sont courtes, et nous préférons vous le dire simplement.",
        ],
        items: c.lines.map((l) => ({ title: l.title, meta: `Taille ${l.size}`, price: l.unitPrice })),
        cta: { label: "Retrouver mon panier", href: absolute("/boutique") },
        signature: SIGNATURE,
      });
      await sendFlowEmail({ to: c.customers.email, subject: "Votre sélection vous attend", ...mail, flow: "panier" });
      await db.from("carts").update({ reminded_at: now.toISOString() }).eq("customer_id", c.customer_id);
      report.panier++;
    }

    // anniversaires (lettres acceptées)
    const mmdd = now.toISOString().slice(5, 10);
    const { data: birthdays } = await db.from("customers").select("email, first_name, birthday").eq("marketing_email", true).not("birthday", "is", null).limit(5000);
    for (const b of (birthdays ?? []) as { email: string; first_name: string | null; birthday: string }[]) {
      if (b.birthday.slice(5, 10) !== mmdd) continue;
      const sent = await once("anniversaire", `${b.email.toLowerCase()}:${now.getUTCFullYear()}`, async () => {
        const mail = brandEmail({
          preheader: "Un mot de l’atelier, pour votre anniversaire.",
          title: "Joyeux anniversaire",
          paragraphs: [greet(b.first_name), "Toute l’équipe de l’atelier vous souhaite un très bel anniversaire. Que cette nouvelle année vous ressemble : lumineuse, juste, pleine de beaux gestes."],
          cta: { label: "Passer à l’atelier", href: absolute("/contact#rendez-vous") },
          signature: SIGNATURE,
        });
        await sendFlowEmail({ to: b.email, subject: "Joyeux anniversaire", ...mail, flow: "anniversaire" });
      });
      if (sent) report.anniversaire++;
    }

    // réactivation : lettres acceptées, ni commande ni visite depuis 6 mois
    const sixMonths = new Date(now.getTime() - 182 * day).toISOString();
    const { data: dormant } = await db
      .from("customer_stats")
      .select("email, first_name, last_order_at, created_at, marketing_email")
      .eq("marketing_email", true)
      .lt("created_at", sixMonths)
      .limit(5000);
    for (const d of (dormant ?? []) as { email: string; first_name: string | null; last_order_at: string | null }[]) {
      if (d.last_order_at && d.last_order_at > sixMonths) continue;
      const sent = await once("reactivation", `${d.email.toLowerCase()}:${now.getUTCFullYear()}`, async () => {
        const mail = brandEmail({
          preheader: "De nouvelles pièces sont sorties de l’atelier.",
          title: "Des nouvelles de l’atelier",
          paragraphs: [
            greet(d.first_name),
            "Il y a quelque temps que nous ne nous sommes pas écrit. Depuis, de nouvelles pièces sont nées à l’atelier, toujours à la main, toujours en séries courtes.",
            "Nous serions heureuses de vous les montrer, en ligne ou lors d’un essayage à Paris.",
          ],
          cta: { label: "Voir les nouvelles pièces", href: absolute("/boutique") },
          signature: SIGNATURE,
          footnote: "Vous ne souhaitez plus recevoir nos lettres ? Un clic sur le lien de désinscription suffit.",
        });
        await sendFlowEmail({ to: d.email, subject: "Des nouvelles de l’atelier", ...mail, flow: "reactivation" });
      });
      if (sent) report.reactivation++;
    }
  }
  await kv.push("flows:runs", { at: now.toISOString(), report }, 120);
  return report;
}

export const contactEmail = identity.email;

/** Demande d'avis (flux du 14e jour après la livraison, ou envoi manuel depuis l'Atelier). */
export async function sendReviewRequest(o: Order) {
  const mail = brandEmail({
    preheader: "Votre regard compte pour l’atelier.",
    title: "Comment la portez-vous ?",
    paragraphs: [
      greet(o.name.split(" ")[0]),
      "Votre pièce vous accompagne depuis quelques jours. Nous aimerions savoir comment elle tombe, ce que vous ressentez en la portant, et si la taille vous a semblé juste.",
      "Votre avis, vérifié et publié avec votre prénom seulement, aide d’autres femmes à choisir. Une photo est bienvenue, mais jamais obligatoire.",
    ],
    cta: { label: "Donner mon avis", href: absolute(`/avis/${encodeURIComponent(o.number)}?t=${encodeURIComponent(reviewToken(o))}`) },
    signature: SIGNATURE,
    footnote: "Vous ne souhaitez plus recevoir de demande d’avis ? Répondez simplement à ce message.",
  });
  await sendFlowEmail({ to: o.email, subject: "Comment la portez-vous ?", ...mail, flow: "avis" });
}
