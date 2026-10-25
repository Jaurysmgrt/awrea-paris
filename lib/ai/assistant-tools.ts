/**
 * Outils de l'assistante clientes. Tous en lecture seule, sauf la transmission à la Maison.
 * Chaque requête reçoit un contexte qui collecte ce que l'interface doit afficher (cartes des pièces
 * citées, confirmation de transmission) et la cliente connectée, s'il y en a une.
 *
 * Modèle de la Maison : chaque pièce est créée sur demande, sans stock, par des artisans français.
 * Les outils donnent donc un délai de fabrication, jamais une disponibilité. Une information que la
 * Maison n'a pas encore donnée (composition, entretien, taille du mannequin) revient « null », avec
 * la consigne de ne pas la deviner. L'étape d'une commande n'est donnée qu'avec son numéro et son
 * adresse e-mail, ou à la cliente connectée pour ses propres commandes.
 */
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { getAllProducts, getProduct } from "@/lib/commerce";
import { leadTimeText } from "@/lib/commerce/availability";
import { getOrder, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { orderLink } from "@/lib/commerce/order-access";
import type { LeadTime, Order, Product } from "@/lib/commerce/types";
import { ORDER_STAGES, orderTimeline } from "@/lib/customers/order-timeline";
import { listOrders } from "@/lib/customers";
import type { CustomerSession } from "@/lib/customers/types";
import { withStages } from "@/lib/store/order-stages";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { addInbox, type InboxMessage } from "@/lib/inbox";
import { logAction } from "@/lib/agents/log";
import { deliveryModes } from "./maison";

/** Carte d'une pièce affichée sous la réponse (textes mis en forme par le navigateur, document « catalogue »). */
export interface PieceCard {
  handle: string;
  title: string;
  price: string;
  image: string;
  /** délai de fabrication : la pièce est créée après la commande */
  leadTime: LeadTime;
  /** photo générée en attendant les photographies de la Maison */
  provisoire: boolean;
}

export interface AssistantContext {
  pieces: Map<string, PieceCard>;
  handoff: { email: string } | null;
  /** cliente connectée à son compte (session vérifiée par le serveur), sinon null */
  customer: CustomerSession | null;
}

export function newAssistantContext(customer: CustomerSession | null = null): AssistantContext {
  return { pieces: new Map(), handoff: null, customer };
}

/** Une information que la Maison n'a pas encore donnée : jamais transmise telle quelle. */
const known = (s: string) => !/\[\s*À COMPLÉTER/i.test(s) && s.trim().length > 0;
const UNKNOWN = "Information pas encore communiquée par la Maison : ne la devinez pas, proposez de transmettre la question à la créatrice.";

export function pieceCard(p: Product): PieceCard {
  return { handle: p.handle, title: p.title, price: formatPrice(p.price), image: p.images[0]?.src ?? "", leadTime: p.leadTime, provisoire: Boolean(p.images[0]?.provisoire) };
}

function summary(p: Product) {
  return {
    handle: p.handle,
    nom: p.title,
    accroche: p.tagline,
    categorie: p.category,
    prix: formatPrice(p.price),
    delai_fabrication: leadTimeText(p.leadTime),
    url: `/boutique/${p.handle}`,
  };
}

const dateFr = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

/** Ce que la cliente peut savoir de SA commande : étapes, délai annoncé, suivi. */
export function orderFacts(o: Order, now: Date = new Date()) {
  const t = orderTimeline(o, now);
  const state = { done: "franchie", current: "en cours", todo: "à venir" } as const;
  return {
    numero: o.number,
    date: dateFr(o.createdAt),
    etape: statusLabel[o.status],
    etapes: ORDER_STAGES.map((s, i) => ({ etape: statusLabel[s], etat: state[t.steps[i].state], date: t.steps[i].at ? dateFr(t.steps[i].at!) : null })),
    pieces: o.lines.map((l) => `${l.title} (${l.size})`),
    delai_fabrication: t.leadTime ? leadTimeText(t.leadTime) : null,
    fin_de_confection_estimee: t.estimate ? `entre le ${dateFr(t.estimate.from)} et le ${dateFr(t.estimate.to)}` : null,
    confection_en_retard: t.late ? "La date annoncée est passée : excusez la Maison et proposez de transmettre à la créatrice, qui donnera une date." : null,
    livraison: o.shipping.method,
    suivi_colis: trackingUrl(o.shipping.carrier, o.shipping.tracking),
    page_de_suivi: orderLink(o),
  };
}

const orderNumber = (n: string) => n.trim().replace(/^#/, "").replace(/\s/g, "").toUpperCase().replace(/^AW(\d)/, "AW-$1").replace(/^(\d+)$/, "AW-$1");

export function assistantTools(ctx: AssistantContext) {
  const searchPieces = betaZodTool({
    name: "search_pieces",
    description:
      "Cherche des pièces dans le catalogue Awrea Paris. À utiliser dès que la cliente évoque une pièce, une catégorie, une matière, une occasion, un budget ou une taille. Renvoie les pièces correspondantes avec leur prix, leur délai de fabrication et leur lien. Chaque pièce est créée sur demande : aucune n’est épuisée.",
    inputSchema: z.object({
      query: z.string().max(120).optional().describe("Mots-clés libres : matière, occasion, nom de pièce (ex. « dentelle », « dîner », « Odessa »)"),
      category: z.enum(["robe", "body", "top", "jupe", "accessoire"]).optional(),
      size: z.enum(["XS", "S", "M", "L", "XL"]).optional().describe("Ne garder que les pièces proposées dans cette taille"),
      max_price_eur: z.number().positive().optional(),
    }),
    run: async ({ query, category, size, max_price_eur }) => {
      const all = await getAllProducts();
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const words = norm(query ?? "")
        .split(/\W+/)
        .filter((w) => w.length > 2);
      const list = all.filter((p) => {
        if (category && p.category !== category) return false;
        if (size && !p.variants.some((v) => v.size === size)) return false;
        if (max_price_eur && p.price / 100 > max_price_eur) return false;
        if (!words.length) return true;
        const hay = norm([p.title, p.tagline, ...p.description, ...p.details, ...p.tags, ...p.materials.map((m) => m.name), p.collection].join(" "));
        return words.some((w) => hay.includes(w));
      });
      list.slice(0, 4).forEach((p) => ctx.pieces.set(p.handle, pieceCard(p)));
      return JSON.stringify({ resultats: list.slice(0, 8).map(summary), total: list.length });
    },
  });

  const getPiece = betaZodTool({
    name: "get_piece",
    description:
      "Donne la fiche complète d’une pièce : description, détails, coupe, tailles proposées, délai de fabrication, et ce que la Maison a déjà communiqué de sa composition et de son entretien. À utiliser avant tout conseil précis sur une pièce.",
    inputSchema: z.object({ handle: z.string().min(1).max(120).describe("Identifiant de la pièce, ex. robe-odessa") }),
    run: async ({ handle }) => {
      const p = await getProduct(handle);
      if (!p) return JSON.stringify({ erreur: "Pièce introuvable. Utilisez search_pieces pour trouver l’identifiant exact." });
      ctx.pieces.set(p.handle, pieceCard(p));
      const care = p.care.filter(known);
      return JSON.stringify({
        ...summary(p),
        description: p.description.filter(known),
        details: p.details.filter(known),
        coupe: known(p.fit) ? p.fit : null,
        tailles: p.variants.map((v) => v.size),
        fabrication: "Créée sur demande, après la commande, dans la taille choisie, par des artisans français. Aucun stock.",
        matieres: p.materials.length ? p.materials.map((m) => `${m.percent} % ${m.name}`) : null,
        doublure: p.lining && known(p.lining) ? p.lining : null,
        entretien: care.length ? care : null,
        mannequin: known(p.model) ? p.model : null,
        si_null: UNKNOWN,
        visuels: p.images.some((i) => i.provisoire) ? "Photos provisoires : images générées en attendant les photographies de la Maison." : null,
      });
    },
  });

  const sizeGuide = betaZodTool({
    name: "size_guide",
    description:
      "Renvoie le guide des tailles de la Maison (mesures du corps) et, si une pièce est précisée, sa coupe et ses tailles. À utiliser pour tout conseil de taille, avec les mesures données par la cliente.",
    inputSchema: z.object({ handle: z.string().max(120).optional() }),
    run: async ({ handle }) => {
      const p = handle ? await getProduct(handle) : null;
      return JSON.stringify({
        colonnes: shop.sizeGuide.headers,
        tailles: shop.sizeGuide.rows,
        conseil_general: shop.sizeGuide.note,
        guide_confirme: shop.sizeGuide.confirme ? true : "Repères encore à confirmer par la Maison : dites-le si la cliente hésite.",
        page: "/guide-des-tailles",
        piece: p ? { nom: p.title, coupe: known(p.fit) ? p.fit : null, tailles: p.variants.map((v) => v.size), mannequin: known(p.model) ? p.model : null } : null,
      });
    },
  });

  const shipping = betaZodTool({
    name: "shipping_options",
    description: "Donne les modes, les tarifs et le délai de livraison pour un pays (code ISO à deux lettres, ex. FR, BE). Les conditions générales de vente prévoient une livraison en France métropolitaine.",
    inputSchema: z.object({ country: z.string().length(2).describe("Code pays ISO 3166-1 alpha-2") }),
    run: async ({ country }) => {
      const code = country.toUpperCase();
      const name = shop.countries.find((x) => x.code === code)?.name ?? code;
      if (code !== "FR") {
        return JSON.stringify({
          pays: name,
          livraison_prevue: false,
          message: "Les conditions générales de vente prévoient une livraison en France métropolitaine. Pour une autre destination, proposez de transmettre la demande à la créatrice, qui répond elle-même.",
        });
      }
      return JSON.stringify({
        pays: "France métropolitaine",
        livraison_prevue: true,
        modes: deliveryModes().map((r) => ({ mode: r.label, prix: formatPrice(r.price), offert_des: r.freeAboveThreshold ? formatPrice(shop.freeShippingThreshold) : null })),
        delai: "La pièce est d’abord confectionnée (délai de fabrication indiqué sur sa fiche), puis livrée : les conditions générales de vente prévoient 5 à 10 jours ouvrés pour la livraison.",
        frais: "Calculés et affichés avant le paiement.",
      });
    },
  });

  const trackOrder = betaZodTool({
    name: "track_order",
    description:
      "Donne l’étape d’une commande (Commande reçue, En confection, Prête, Expédiée, Livrée), la fin de confection estimée et le suivi du colis. Exige le numéro de commande (AW-xxxx) ET l’adresse e-mail de la commande. Une cliente connectée à son compte n’a pas à donner son e-mail, et sans numéro elle obtient ses dernières commandes. Si rien ne correspond, ne donnez aucune information.",
    inputSchema: z.object({
      order_number: z.string().min(3).max(20).optional().describe("Numéro de commande, ex. AW-1031"),
      email: z.email().optional().describe("Adresse e-mail utilisée pour la commande"),
    }),
    run: async ({ order_number, email }) => {
      if (!order_number) {
        if (!ctx.customer) return JSON.stringify({ trouve: false, message: "Demandez le numéro de commande et l’adresse e-mail utilisée, ou invitez la cliente à se connecter à son compte." });
        const mine = (await listOrders(ctx.customer)).slice(0, 3);
        return JSON.stringify({ trouve: mine.length > 0, cliente_connectee: true, commandes: mine.map((o) => orderFacts(o)) });
      }
      const mail = (email ?? ctx.customer?.email ?? "").trim().toLowerCase();
      const o = await getOrder(orderNumber(order_number));
      if (!o || !mail || o.email.trim().toLowerCase() !== mail) {
        return JSON.stringify({ trouve: false, message: "Aucune commande ne correspond à ce numéro et à cette adresse e-mail." });
      }
      const [full] = await withStages([o]);
      return JSON.stringify({ trouve: true, ...orderFacts(full) });
    },
  });

  const handoff = betaZodTool({
    name: "handoff_to_atelier",
    description:
      "Transmet la conversation à la Maison pour une réponse de la créatrice elle-même. À utiliser quand la cliente le demande, pour une réclamation, un retour, une annulation, un remboursement, un retard de confection, une demande de rendez-vous ou de sur mesure, une livraison hors de France métropolitaine, une information que la Maison n’a pas encore donnée (composition, entretien, mesure), ou toute question sans réponse certaine. Demandez d’abord l’adresse e-mail de la cliente, sauf si elle est connectée.",
    inputSchema: z.object({
      email: z.email().optional(),
      name: z.string().max(120).optional(),
      reason: z.enum(["demande_cliente", "reclamation", "retour_remboursement", "annulation", "retard_confection", "sur_mesure_rendez_vous", "commande", "information_manquante", "question_sans_reponse", "autre"]),
      summary: z.string().min(10).max(1500).describe("Résumé factuel de la demande, en français, pour la créatrice"),
    }),
    run: async ({ email, name, reason, summary: text }) => {
      const mail = email ?? ctx.customer?.email;
      if (!mail) return JSON.stringify({ transmis: false, message: "Demandez d’abord l’adresse e-mail de la cliente." });
      const msg: InboxMessage = {
        id: `msg-${Date.now().toString(36)}`,
        date: new Date().toISOString(),
        channel: "assistant",
        name: name ?? "",
        email: mail,
        subject: "Message transmis par l’assistante",
        message: `[${reason}] ${text}`,
        status: "escalated",
      };
      await addInbox(msg);
      await logAction({
        agent: "service-client",
        kind: "transmission",
        status: "info",
        summary: `L’assistante a transmis à la créatrice une demande de ${mail}`,
        target: { type: "message", id: msg.id, label: mail, href: "atelier:/messages" },
      });
      ctx.handoff = { email: mail };
      return JSON.stringify({ transmis: true, delai_reponse: "sous 48 heures ouvrées, par e-mail" });
    },
  });

  return [searchPieces, getPiece, sizeGuide, shipping, trackOrder, handoff];
}
