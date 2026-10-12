/**
 * Outils de l'assistante clientes. Tous en lecture seule, sauf la transmission à l'atelier.
 * Chaque requête reçoit un contexte qui collecte ce que l'interface doit afficher
 * (cartes des pièces citées, confirmation de transmission).
 */
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { getAllProducts, getProduct } from "@/lib/commerce";
import { availabilityLabel, editionInfo, productAvailability, variantAvailability } from "@/lib/commerce/availability";
import { getOrder, statusLabel, trackingUrl } from "@/lib/commerce/orders";
import type { Product } from "@/lib/commerce/types";
import { shop } from "@/content/settings";
import { formatPrice } from "@/lib/format";
import { addInbox, type InboxMessage } from "@/lib/inbox";
import { logAction } from "@/lib/agents/log";

export interface PieceCard {
  handle: string;
  title: string;
  price: string;
  image: string;
  edition: string;
  availability: string;
}

export interface AssistantContext {
  pieces: Map<string, PieceCard>;
  handoff: { email: string } | null;
}

export function newAssistantContext(): AssistantContext {
  return { pieces: new Map(), handoff: null };
}

function card(p: Product): PieceCard {
  const ed = editionInfo(p);
  return {
    handle: p.handle,
    title: p.title,
    price: formatPrice(p.price),
    image: p.images[0]?.src ?? "",
    edition: ed.unique ? "Pièce unique" : ed.complete ? "Sur commande" : ed.label,
    availability: availabilityLabel(productAvailability(p), p.leadTimeWeeks),
  };
}

function summary(p: Product) {
  const ed = editionInfo(p);
  return {
    handle: p.handle,
    nom: p.title,
    accroche: p.tagline,
    categorie: p.category,
    prix: formatPrice(p.price),
    edition: ed.unique ? "pièce unique" : `${ed.label} — ${ed.remainingLabel}`,
    disponibilite: availabilityLabel(productAvailability(p), p.leadTimeWeeks),
    url: `/boutique/${p.handle}`,
  };
}

export function assistantTools(ctx: AssistantContext) {
  const searchPieces = betaZodTool({
    name: "search_pieces",
    description:
      "Cherche des pièces dans le catalogue Awrea Paris. À utiliser dès que la cliente évoque une pièce, une catégorie, une matière, une occasion, un budget ou une taille. Renvoie la liste des pièces correspondantes avec prix, édition, disponibilité et lien.",
    inputSchema: z.object({
      query: z.string().max(120).optional().describe("Mots-clés libres : matière, occasion, nom de pièce (ex. « dentelle », « dîner », « Odessa »)"),
      category: z.enum(["robe", "body", "top", "jupe", "accessoire"]).optional(),
      size: z.enum(["XS", "S", "M", "L", "XL"]).optional().describe("Ne garder que les pièces disponibles ou en précommande dans cette taille"),
      max_price_eur: z.number().positive().optional(),
    }),
    run: async ({ query, category, size, max_price_eur }) => {
      const all = await getAllProducts();
      const words = (query ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/\W+/)
        .filter((w) => w.length > 2);
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const list = all.filter((p) => {
        if (category && p.category !== category) return false;
        if (size && !p.variants.some((v) => v.size === size && (v.quantity > 0 || v.preorder))) return false;
        if (max_price_eur && p.price / 100 > max_price_eur) return false;
        if (!words.length) return true;
        const hay = norm([p.title, p.tagline, ...p.description, ...p.tags, ...p.materials.map((m) => m.name), p.collection].join(" "));
        return words.some((w) => hay.includes(w));
      });
      list.slice(0, 4).forEach((p) => ctx.pieces.set(p.handle, card(p)));
      return JSON.stringify({ resultats: list.slice(0, 8).map(summary), total: list.length });
    },
  });

  const getPiece = betaZodTool({
    name: "get_piece",
    description:
      "Donne la fiche complète d'une pièce : description, matières, entretien, coupe, taille portée par le mannequin, disponibilité par taille, délai de fabrication, numéro d'édition. À utiliser avant tout conseil précis sur une pièce.",
    inputSchema: z.object({ handle: z.string().min(1).max(120).describe("Identifiant de la pièce, ex. robe-odessa") }),
    run: async ({ handle }) => {
      const p = await getProduct(handle);
      if (!p) return JSON.stringify({ erreur: "Pièce introuvable. Utilisez search_pieces pour trouver l'identifiant exact." });
      ctx.pieces.set(p.handle, card(p));
      return JSON.stringify({
        ...summary(p),
        description: p.description,
        details: p.details,
        matieres: p.materials.map((m) => `${m.percent} % ${m.name}`),
        doublure: p.lining ?? null,
        entretien: p.care,
        coupe: p.fit,
        mannequin: p.model,
        tailles: p.variants.map((v) => ({ taille: v.size, statut: availabilityLabel(variantAvailability(p, v), p.leadTimeWeeks) })),
        delai_fabrication_semaines: p.leadTimeWeeks ?? null,
        fait_main: "Fait main à Paris, dans l'atelier de la créatrice",
      });
    },
  });

  const sizeGuide = betaZodTool({
    name: "size_guide",
    description:
      "Renvoie le guide des tailles de la maison et, si une pièce est précisée, ses indications de coupe. À utiliser pour tout conseil de taille, en le combinant avec les mesures données par la cliente.",
    inputSchema: z.object({ handle: z.string().max(120).optional() }),
    run: async ({ handle }) => {
      const p = handle ? await getProduct(handle) : null;
      return JSON.stringify({
        colonnes: shop.sizeGuide.headers,
        tailles: shop.sizeGuide.rows,
        conseil_general: shop.sizeGuide.note,
        piece: p ? { nom: p.title, coupe: p.fit, mannequin: p.model } : null,
      });
    },
  });

  const shipping = betaZodTool({
    name: "shipping_options",
    description: "Donne les modes, tarifs et délais de livraison pour un pays (code ISO à deux lettres, ex. FR, BE, US).",
    inputSchema: z.object({ country: z.string().length(2).describe("Code pays ISO 3166-1 alpha-2") }),
    run: async ({ country }) => {
      const c = shop.countries.find((x) => x.code === country.toUpperCase());
      const zone = c?.zone ?? "WORLD";
      return JSON.stringify({
        pays: c?.name ?? country.toUpperCase(),
        livraison_possible: true,
        modes: shop.shippingRates
          .filter((r) => r.zone === zone)
          .map((r) => ({ mode: r.label, prix: r.price ? formatPrice(r.price) : "offert", offert_des: r.freeAboveThreshold ? formatPrice(shop.freeShippingThreshold) : null, delai: r.delay })),
        expedition: `Pièces disponibles expédiées sous ${shop.dispatchDays}.`,
        douane: zone === "WORLD" ? "Droits et taxes d'importation à la charge du destinataire." : null,
      });
    },
  });

  const trackOrder = betaZodTool({
    name: "track_order",
    description:
      "Donne le statut et le lien de suivi d'une commande. Exige le numéro de commande (AW-xxxx) ET l'adresse e-mail utilisée lors de la commande : ne jamais donner d'information si l'e-mail ne correspond pas.",
    inputSchema: z.object({ order_number: z.string().min(3).max(20), email: z.email() }),
    run: async ({ order_number, email }) => {
      const o = await getOrder(order_number);
      if (!o || o.email.toLowerCase() !== email.toLowerCase()) {
        return JSON.stringify({ trouve: false, message: "Aucune commande ne correspond à ce numéro et à cette adresse e-mail." });
      }
      return JSON.stringify({
        trouve: true,
        numero: o.number,
        date: o.createdAt.slice(0, 10),
        statut: statusLabel[o.status],
        pieces: o.lines.map((l) => `${l.title} (${l.size})`),
        livraison: o.shipping.method,
        suivi: trackingUrl(o.shipping.carrier, o.shipping.tracking),
      });
    },
  });

  const handoff = betaZodTool({
    name: "handoff_to_atelier",
    description:
      "Transmet la conversation à l'atelier pour une réponse humaine de la créatrice. À utiliser quand la cliente le demande, pour une réclamation, un remboursement, un retour, une demande de sur-mesure ou de rendez-vous, une commande bloquée, un sujet sensible, ou toute question à laquelle vous ne pouvez pas répondre avec certitude. Demandez d'abord l'adresse e-mail de la cliente.",
    inputSchema: z.object({
      email: z.email(),
      name: z.string().max(120).optional(),
      reason: z.enum(["demande_cliente", "reclamation", "retour_remboursement", "sur_mesure_rendez_vous", "commande", "question_sans_reponse", "autre"]),
      summary: z.string().min(10).max(1500).describe("Résumé factuel de la demande, en français, pour l'atelier"),
    }),
    run: async ({ email, name, reason, summary: text }) => {
      const msg: InboxMessage = {
        id: `msg-${Date.now().toString(36)}`,
        date: new Date().toISOString(),
        channel: "assistant",
        name: name ?? "",
        email,
        subject: `Transmis par l'assistante — ${reason.replace(/_/g, " ")}`,
        message: text,
        status: "escalated",
      };
      await addInbox(msg);
      await logAction({
        agent: "service-client",
        kind: "transmission",
        status: "info",
        summary: `L'assistante a transmis une demande (${reason.replace(/_/g, " ")}) de ${email} à l'atelier`,
        target: { type: "message", id: msg.id, label: email, href: "/gestion#messages" },
      });
      ctx.handoff = { email };
      return JSON.stringify({ transmis: true, delai_reponse: "sous 48 heures ouvrées, par e-mail" });
    },
  });

  return [searchPieces, getPiece, sizeGuide, shipping, trackOrder, handoff];
}
