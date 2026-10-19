/**
 * AGENT COMMANDES ET STOCK — surveille les commandes. Les pièces sont créées sur demande, sans
 * stock : plus de rupture, de remise en stock ni de liste d'attente à surveiller (modèle de la
 * Maison). Il signale les commandes bloquées et les confections en retard sur le délai annoncé.
 * Les contrôles sont déterministes ; Claude rédige le message d'alerte à l'atelier.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { kv } from "@/lib/store";
import { RunRecorder, type AgentRun } from "../run";

const DAY = 24 * 60 * 60 * 1000;

interface Memory {
  alerted: Record<string, number>; // variantId -> quantité au moment de l'alerte
  flagged: string[]; // commandes déjà signalées
  restocked: string[]; // commandes retournées déjà remises en stock
}

const MEMORY_KEY = "agents:commandes-stock:memory";

export async function runCommandesStockAgent(trigger: AgentRun["trigger"] = "cron"): Promise<AgentRun> {
  const rec = new RunRecorder("commandes-stock", trigger);
  const memory = (await kv.get<Memory>(MEMORY_KEY)) ?? { alerted: {}, flagged: [], restocked: [] };
  const findings: string[] = [];
  try {
    const [products, orders] = await Promise.all([getAllProducts(), getOrders()]);
    const now = Date.now();

    // Commandes bloquées ou en retard
    for (const o of orders) {
      if (memory.flagged.includes(o.id)) continue;
      const age = (now - new Date(o.createdAt).getTime()) / DAY;
      const lead = Math.max(0, ...o.lines.map((l) => products.find((p) => p.handle === l.handle)?.leadTime.max ?? 0));
      let reason: string | null = null;
      if (o.status === "blocked") reason = "Commande en attente (paiement à vérifier ou adresse incomplète).";
      else if (o.status === "paid" && age > 5) reason = `Reçue depuis ${Math.floor(age)} jours et pas encore en confection.`;
      else if (o.status === "in_production" && lead && age > lead * 7 + 7) reason = `En confection depuis ${Math.floor(age)} jours (délai annoncé : ${lead} semaines au plus).`;
      else if (o.status === "pending" && age > 2) reason = "Paiement en attente depuis plus de 48 heures.";
      if (reason) {
        await rec.act("flag_order", { orderId: o.id, reason }, { summary: `Commande ${o.number} à vérifier`, rationale: reason });
        memory.flagged.push(o.id);
        findings.push(`Commande ${o.number} : ${reason}`);
      }
    }

    // Alerte de synthèse à l'atelier
    if (findings.length) {
      let subject = `Atelier : ${findings.length} point(s) à regarder`;
      let body = findings.map((f) => `${f}`).join("\n\n");
      if (aiEnabled) {
        const msg = await generateStructured({
          instructions: "Mission : agent Commandes et stock. Vous écrivez à la créatrice une alerte courte et calme, sans jargon. Un objet de huit mots au plus. Puis un paragraphe par point, du plus urgent au moins urgent, chacun avec l’action conseillée. Ni tiret ni puce devant les points.",
          content: `Constats du jour :\n${findings.map((f) => `${f}`).join("\n")}`,
          schema: z.object({ subject: z.string(), body: z.string().describe("Paragraphes séparés par une ligne vide") }),
          effort: "low",
        });
        subject = msg.subject;
        body = msg.body;
      }
      await rec.act("alert_atelier", { subject, body }, { summary: subject });
    }
    await kv.set(MEMORY_KEY, { ...memory, flagged: memory.flagged.slice(-500), restocked: memory.restocked.slice(-500) });
    return rec.finish(findings.length ? `${findings.length} constat(s), alerte envoyée à l’atelier` : "Commandes en ordre");
  } catch (e) {
    rec.error(e);
    await kv.set(MEMORY_KEY, memory);
    return rec.finish("Passage interrompu");
  }
}
