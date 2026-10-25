/**
 * AGENT COMMANDES ET CONFECTION — chaque pièce est créée sur demande, après la commande, par des
 * artisans français : il n'y a ni stock, ni rupture, ni liste d'attente à surveiller.
 * L'agent suit les commandes :
 *  1. il signale les commandes bloquées et les paiements en attente ;
 *  2. il compare chaque confection au délai annoncé à la commande et prévient la créatrice quand
 *     la date approche, quand elle est passée, ou quand une commande reçue tarde à entrer en
 *     confection (lib/agents/confection.ts) ;
 *  3. quand un retard se dessine, il prépare un message pour la cliente, qui ne part qu'avec la
 *     validation de la créatrice (lib/agents/policy.ts) ;
 *  4. il présente les prix et les délais encore provisoires, à confirmer par la créatrice.
 * Les contrôles sont déterministes ; Claude rédige seulement l'alerte de synthèse à l'atelier.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { FENCE_NOTE, fence } from "@/lib/ai/guard";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { leadTimeText } from "@/lib/commerce/availability";
import { withStages } from "@/lib/store/order-stages";
import { formatPrice } from "@/lib/format";
import { kv } from "@/lib/store";
import { RunRecorder, type AgentRun } from "../run";
import { alertLine, confectionAlerts, delayLooms, delayMessage, type ConfectionKind } from "../confection";

const DAY = 86_400_000;
/** une confirmation refusée ou laissée de côté est reproposée au plus tôt un mois après */
const TERMS_EVERY_DAYS = 30;

interface Memory {
  /** commandes signalées (bloquées, paiement en attente) */
  flagged: string[];
  /** dernière situation de confection signalée, par commande */
  alerted: Record<string, ConfectionKind>;
  /** commandes pour lesquelles un message à la cliente a été préparé */
  messaged: string[];
  /** pièce : date de la dernière proposition de confirmation de son prix ou de son délai */
  terms: Record<string, string>;
}

export const MEMORY_KEY = "agents:commandes-confection:memory";
/** mémoire de l'ancien agent « Commandes et stock » : ses commandes déjà signalées ne le sont pas deux fois */
const LEGACY_MEMORY_KEY = "agents:commandes-stock:memory";

async function loadMemory(): Promise<Memory> {
  const m = await kv.get<Partial<Memory>>(MEMORY_KEY);
  const legacy = m ? null : await kv.get<{ flagged?: string[] }>(LEGACY_MEMORY_KEY);
  return { flagged: m?.flagged ?? legacy?.flagged ?? [], alerted: m?.alerted ?? {}, messaged: m?.messaged ?? [], terms: m?.terms ?? {} };
}

const saveMemory = (m: Memory) => kv.set(MEMORY_KEY, { ...m, flagged: m.flagged.slice(-500), messaged: m.messaged.slice(-500) });

export async function runCommandesConfectionAgent(trigger: AgentRun["trigger"] = "cron"): Promise<AgentRun> {
  const rec = new RunRecorder("commandes-confection", trigger);
  const memory = await loadMemory();
  const findings: string[] = [];
  try {
    const [products, orders] = await Promise.all([getAllProducts(), getOrders().then(withStages)]);
    const now = new Date();

    // 1. Commandes bloquées, paiements en attente
    for (const o of orders) {
      if (memory.flagged.includes(o.id)) continue;
      const age = (now.getTime() - new Date(o.createdAt).getTime()) / DAY;
      const reason = o.status === "blocked" ? "Commande en attente : paiement à vérifier ou adresse incomplète." : o.status === "pending" && age > 2 ? "Paiement en attente depuis plus de 48 heures." : null;
      if (!reason) continue;
      await rec.act("flag_order", { orderId: o.id, reason }, { summary: `Commande ${o.number} à vérifier`, rationale: reason });
      memory.flagged.push(o.id);
      findings.push(`Commande ${o.number} : ${reason}`);
    }

    // 2. Confections : la date annoncée approche, elle est passée, ou la confection tarde à commencer
    const alerts = confectionAlerts(orders, products, now);
    for (const a of alerts) {
      // une alerte par situation nouvelle, pas une chaque matin pour la même commande
      if (memory.alerted[a.orderId] !== a.kind) {
        memory.alerted[a.orderId] = a.kind;
        findings.push(alertLine(a));
      }
      // 3. un retard se dessine : un message pour la cliente, préparé, jamais envoyé sans la créatrice
      if (delayLooms(a) && !memory.messaged.includes(a.orderId)) {
        const m = delayMessage(a);
        const r = await rec.act(
          "send_client_message",
          { orderId: a.orderId, subject: m.subject, body: m.body },
          {
            summary: `Prévenir ${a.name} d’un retard de confection (commande ${a.number})`,
            rationale: `${alertLine(a)} Message préparé pour ${a.email}, envoyé seulement si vous le validez ; refusez-le pour écrire vous-même. Le voici : « ${m.body.replace(/\n+/g, " ")} » Article 5 des conditions générales de vente : sept jours après la date indicative de livraison, la cliente peut demander par écrit la résolution de la vente.`,
          },
        );
        if (r.status === "proposed" || r.status === "done") memory.messaged.push(a.orderId);
      }
    }
    const watched = new Set(alerts.map((a) => a.orderId));
    for (const id of Object.keys(memory.alerted)) if (!watched.has(id)) delete memory.alerted[id];

    // 4. Prix et délais provisoires : la créatrice confirme, ou modifie la pièce dans le Catalogue
    for (const p of products) {
      if (!p.priceProvisional && !p.leadTimeProvisional) {
        delete memory.terms[p.handle];
        continue;
      }
      const last = memory.terms[p.handle];
      if (last && now.getTime() - new Date(last).getTime() < TERMS_EVERY_DAYS * DAY) continue;
      const what = [p.priceProvisional ? `le prix de ${formatPrice(p.price)}` : null, p.leadTimeProvisional ? `le délai de ${leadTimeText(p.leadTime)}` : null].filter(Boolean).join(" et ");
      const r = await rec.act(
        "confirm_piece_terms",
        { handle: p.handle, price: Boolean(p.priceProvisional), leadTime: Boolean(p.leadTimeProvisional) },
        {
          summary: `${p.title} : confirmer ${what}`,
          rationale: `${what.charAt(0).toUpperCase()}${what.slice(1)} ${p.priceProvisional && p.leadTimeProvisional ? "sont" : "est"} encore marqué${p.priceProvisional && p.leadTimeProvisional ? "s" : ""} provisoire${p.priceProvisional && p.leadTimeProvisional ? "s" : ""}. Validez si c’est juste. Pour changer une valeur, ouvrez la pièce dans l’onglet Catalogue.`,
        },
      );
      if (r.status === "proposed" || r.status === "done") memory.terms[p.handle] = now.toISOString();
    }

    // 5. Alerte de synthèse à l'atelier
    if (findings.length) {
      let subject = `Atelier : ${findings.length} point${findings.length > 1 ? "s" : ""} sur les commandes`;
      let body = findings.join("\n\n");
      if (aiEnabled) {
        const msg = await generateStructured({
          instructions: `Mission : agent Commandes et confection. Vous écrivez à la créatrice une alerte courte et calme, sans jargon. Un objet de huit mots au plus. Puis un paragraphe par point, du plus urgent au moins urgent, chacun avec le geste conseillé : relancer l’artisan, valider le message préparé pour la cliente, vérifier un paiement. Ni tiret ni puce devant les points. Chaque pièce est créée sur demande : ne parlez jamais de stock. ${FENCE_NOTE}`,
          content: fence("constats_du_jour", findings.join("\n")),
          schema: z.object({ subject: z.string(), body: z.string().describe("Paragraphes séparés par une ligne vide") }),
          effort: "low",
        });
        subject = msg.subject;
        body = msg.body;
      }
      await rec.act("alert_atelier", { subject, body }, { summary: subject });
    }
    await saveMemory(memory);

    const making = orders.filter((o) => o.status === "paid" || o.status === "in_production").length;
    const late = alerts.filter((a) => a.kind === "en-retard").length;
    const soon = alerts.filter((a) => a.kind !== "en-retard").length;
    const state = `${making} commande${making > 1 ? "s" : ""} à confectionner, ${late} en retard, ${soon} à surveiller`;
    return rec.finish(findings.length ? `${state}. Alerte envoyée à l’atelier.` : `${state}. Rien de nouveau depuis le dernier passage.`);
  } catch (e) {
    rec.error(e);
    await saveMemory(memory);
    return rec.finish("Passage interrompu");
  }
}
