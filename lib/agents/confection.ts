/**
 * Veille de la confection et bilan du catalogue : module pur (aucun accès au stockage), partagé par
 * l'agent « Commandes et confection », l'agent Catalogue, le rôle Production, le rapport de la
 * semaine et le tableau de bord de l'Atelier. Couvert par les tests unitaires (tests/unit/roles.test.ts).
 *
 * Modèle de la Maison : chaque pièce est créée sur demande, après la commande, par des artisans
 * français. Il n'y a ni stock ni rupture à surveiller : seulement des confections à mener dans le
 * délai annoncé à la commande (lib/customers/order-timeline.ts), des prix et des délais encore
 * provisoires à confirmer, et des fiches à compléter (matières, entretien), jamais inventées.
 */
import { orderTimeline, productionStart } from "@/lib/customers/order-timeline";
import { longestLeadTime } from "@/lib/commerce/availability";
import type { LeadTime, Order, Product } from "@/lib/commerce/types";

const DAY = 86_400_000;

/** Seuils de la veille, en jours. */
export const CONFECTION_RULES = {
  /** la fin de confection annoncée approche : la créatrice est prévenue */
  approachingDays: 7,
  /** une commande reçue devrait entrer en confection dans ce délai */
  startWithinDays: 5,
} as const;

/**
 * « en-retard » : le dernier jour annoncé pour la fin de confection est passé ;
 * « proche » : il arrive dans la semaine ;
 * « a-lancer » : la commande est reçue depuis plusieurs jours et la confection n'a pas commencé.
 */
export type ConfectionKind = "en-retard" | "proche" | "a-lancer";

export interface ConfectionAlert {
  orderId: string;
  number: string;
  name: string;
  email: string;
  kind: ConfectionKind;
  /** la confection a commencé (étape « En confection ») */
  started: boolean;
  /** dernier jour annoncé pour la fin de confection (ISO) */
  due: string;
  /** jours avant ce dernier jour ; négatif en cas de retard */
  daysLeft: number;
  /** jours écoulés depuis la réception de la commande */
  sinceReceived: number;
  leadTime: LeadTime;
  /** « La robe Aria (M) » */
  pieces: string[];
}

/** Délai de repli d'une commande passée avant que le délai annoncé ne soit enregistré : le plus long de ses pièces. */
export function fallbackLeadTime(o: Pick<Order, "lines">, products: Pick<Product, "handle" | "leadTime">[]): LeadTime | null {
  return longestLeadTime(o.lines.flatMap((l) => products.find((p) => p.handle === l.handle)?.leadTime ?? []));
}

/** Commandes reçues ou en confection qui demandent l'attention de la créatrice, de la plus pressée à la moins pressée. */
export function confectionAlerts(orders: Order[], products: Pick<Product, "handle" | "leadTime">[], now: Date = new Date()): ConfectionAlert[] {
  const out: ConfectionAlert[] = [];
  for (const o of orders) {
    if (o.status !== "paid" && o.status !== "in_production") continue;
    const t = orderTimeline(o, now, fallbackLeadTime(o, products));
    if (!t.estimate || !t.leadTime) continue;
    const daysLeft = Math.ceil((new Date(t.estimate.to).getTime() - now.getTime()) / DAY);
    const sinceReceived = Math.floor((now.getTime() - new Date(productionStart(o)).getTime()) / DAY);
    const started = o.status === "in_production";
    const kind: ConfectionKind | null = t.late
      ? "en-retard"
      : daysLeft <= CONFECTION_RULES.approachingDays
        ? "proche"
        : !started && sinceReceived > CONFECTION_RULES.startWithinDays
          ? "a-lancer"
          : null;
    if (!kind) continue;
    out.push({
      orderId: o.id,
      number: o.number,
      name: o.name,
      email: o.email,
      kind,
      started,
      due: t.estimate.to,
      daysLeft,
      sinceReceived,
      leadTime: t.leadTime,
      pieces: o.lines.map((l) => `${l.title} (${l.size})`),
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Un retard se dessine : la date annoncée est passée, ou elle approche alors que la confection n'a
 * pas commencé. La cliente mérite alors un mot de la Maison, préparé par l'agent et envoyé seulement
 * si la créatrice le valide.
 */
export const delayLooms = (a: ConfectionAlert) => a.kind === "en-retard" || (a.kind === "proche" && !a.started);

const dateFr = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" }).format(new Date(iso));

/** Constat lisible par la créatrice, une phrase. */
export function alertLine(a: ConfectionAlert): string {
  const what = `Commande ${a.number} (${a.name}, ${a.pieces.join(", ")})`;
  if (a.kind === "en-retard") return `${what} : la confection devait se terminer le ${dateFr(a.due)}, ${-a.daysLeft} jour${-a.daysLeft > 1 ? "s" : ""} de retard.`;
  if (a.kind === "proche") return `${what} : fin de confection annoncée le ${dateFr(a.due)}, dans ${a.daysLeft} jour${a.daysLeft > 1 ? "s" : ""}${a.started ? "." : ", et la confection n’a pas commencé."}`;
  return `${what} : reçue depuis ${a.sinceReceived} jours, pas encore en confection.`;
}

/** Message préparé pour la cliente quand un retard se dessine. Il n'est jamais envoyé sans la créatrice. */
export function delayMessage(a: Pick<ConfectionAlert, "number" | "name" | "pieces">): { subject: string; body: string } {
  const first = a.name.trim().split(/\s+/)[0] ?? "";
  const one = a.pieces.length === 1;
  return {
    subject: `Votre commande ${a.number}`,
    body: [
      first ? `Bonjour ${first},` : "Bonjour,",
      `Votre commande ${a.number} est entre les mains de nos artisans. ${one ? "Sa confection" : "La confection de vos pièces"} demande un peu plus de temps que prévu, et nous préférons vous le dire dès maintenant.`,
      `Nous vous écrirons dès que ${one ? "votre pièce sera prête" : "vos pièces seront prêtes"}, avec la date d’expédition. Si vous avez une question, répondez simplement à ce message.`,
      "Avec toute notre attention,\nL’atelier Awrea Paris",
    ].join("\n\n"),
  };
}

/* ------------------------------------------------------------------ CATALOGUE */

/** Repère d'une information que la Maison n'a pas encore donnée (« [À COMPLÉTER : …] »). */
export const TO_COMPLETE = /\[\s*À COMPLÉTER[^\]]*\]/i;

export interface PieceReview {
  handle: string;
  title: string;
  collection: string;
  /** photos générées en attendant les shootings */
  provisionalPhotos: number;
  price: number;
  priceProvisional: boolean;
  leadTime: LeadTime;
  leadTimeProvisional: boolean;
  /** informations à compléter par la Maison, jamais inventées */
  toComplete: string[];
}

/** Bilan d'une pièce : visuels, prix et délai provisoires, informations à compléter. */
export function reviewPiece(p: Product): PieceReview {
  const photos = [...p.images, ...(p.detailImage && !p.images.some((i) => i.src === p.detailImage!.src) ? [p.detailImage] : [])];
  const toComplete = [
    p.materials.length ? null : "composition des matières",
    !p.care.length || p.care.some((c) => TO_COMPLETE.test(c)) ? "conseils d’entretien" : null,
    p.model.trim() ? null : "taille portée par le mannequin",
    TO_COMPLETE.test([p.fit, p.lining ?? "", ...p.description, ...p.details].join(" ")) ? "textes de la fiche" : null,
  ].filter((x): x is string => Boolean(x));
  return {
    handle: p.handle,
    title: p.title,
    collection: p.collection,
    provisionalPhotos: photos.filter((i) => i.provisoire).length,
    price: p.price,
    priceProvisional: Boolean(p.priceProvisional),
    leadTime: p.leadTime,
    leadTimeProvisional: Boolean(p.leadTimeProvisional),
    toComplete,
  };
}

export interface CatalogueReview {
  pieces: PieceReview[];
  /** pièces dont au moins une photo est provisoire */
  photos: number;
  prices: number;
  leadTimes: number;
  /** pièces dont une information reste à compléter */
  incomplete: number;
}

export function catalogueReview(products: Product[]): CatalogueReview {
  const pieces = products.map(reviewPiece);
  return {
    pieces,
    photos: pieces.filter((p) => p.provisionalPhotos > 0).length,
    prices: pieces.filter((p) => p.priceProvisional).length,
    leadTimes: pieces.filter((p) => p.leadTimeProvisional).length,
    incomplete: pieces.filter((p) => p.toComplete.length > 0).length,
  };
}
