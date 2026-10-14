/**
 * AGENT COMMANDES ET STOCK — surveille les ventes et les stocks :
 * alerte en cas de rupture, prévient automatiquement la liste d'attente quand une pièce revient,
 * remet en stock les pièces retournées, signale les commandes bloquées et les précommandes en retard.
 * Les contrôles sont déterministes ; Claude rédige le message d'alerte à l'atelier.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { editionInfo } from "@/lib/commerce/availability";
import { getWaitlist } from "@/lib/waitlist";
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
    const [products, orders, waitlist] = await Promise.all([getAllProducts(), getOrders(), getWaitlist()]);
    const now = Date.now();

    // 1. Retours : la pièce revient en stock (une seule fois par commande)
    for (const o of orders.filter((x) => x.status === "returned" && !memory.restocked.includes(x.id))) {
      for (const l of o.lines) {
        const p = products.find((x) => x.handle === l.handle);
        const v = p?.variants.find((x) => x.size === l.size);
        if (!p || !v) continue;
        const r = await rec.act("update_stock", { handle: p.handle, size: v.size, quantity: v.quantity + l.quantity }, { summary: `Retour ${o.number} : ${p.title} (${v.size}) remise en stock`, rationale: "Pièce retournée, à vérifier à réception" });
        if (r.status === "done") v.quantity += l.quantity;
      }
      memory.restocked.push(o.id);
    }

    // 2. Ruptures et dernières pièces (alerte seulement si la situation a changé)
    for (const p of products) {
      const ed = editionInfo(p);
      for (const v of p.variants) {
        const before = memory.alerted[v.id];
        if (v.quantity === 0 && before !== 0) {
          memory.alerted[v.id] = 0;
          findings.push(`${p.title} — taille ${v.size} : rupture${v.preorder && !ed.complete ? " (passe en précommande)" : v.preorder ? " (sur commande)" : " (liste d’attente ouverte)"}`);
        } else if (v.quantity === 1 && before !== 1) {
          memory.alerted[v.id] = 1;
          findings.push(`${p.title} — taille ${v.size} : dernière pièce en stock`);
        } else if (v.quantity > 1 && before !== undefined) {
          delete memory.alerted[v.id];
        }
      }
    }

    // 3. Liste d'attente : la pièce est de nouveau disponible
    const pending = waitlist.filter((w) => !w.notifiedAt);
    const groups = new Map<string, { handle: string; size: string | null }>();
    for (const w of pending) groups.set(`${w.handle}|${w.size ?? ""}`, { handle: w.handle, size: w.size });
    for (const g of groups.values()) {
      const p = products.find((x) => x.handle === g.handle);
      if (!p) continue;
      const available = g.size ? p.variants.some((v) => v.size === g.size && v.quantity > 0) : p.variants.some((v) => v.quantity > 0);
      if (available) {
        await rec.act("notify_waitlist", { handle: p.handle, size: (g.size as "XS" | "S" | "M" | "L" | "XL" | "TU" | null) ?? null }, { summary: `Prévenir la liste d’attente : ${p.title}${g.size ? ` (${g.size})` : ""}`, rationale: "La pièce est de nouveau disponible" });
      }
    }

    // 4. Commandes bloquées ou en retard
    for (const o of orders) {
      if (memory.flagged.includes(o.id)) continue;
      const age = (now - new Date(o.createdAt).getTime()) / DAY;
      const lead = Math.max(0, ...o.lines.map((l) => products.find((p) => p.handle === l.handle)?.leadTimeWeeks ?? 0));
      let reason: string | null = null;
      if (o.status === "blocked") reason = "Commande en attente (paiement à vérifier ou adresse incomplète).";
      else if (o.status === "paid" && age > 5) reason = `Payée depuis ${Math.floor(age)} jours et toujours pas expédiée.`;
      else if (o.status === "in_production" && lead && age > lead * 7 + 7) reason = `Précommande en fabrication depuis ${Math.floor(age)} jours (délai annoncé : ${lead} semaines).`;
      else if (o.status === "pending" && age > 2) reason = "Paiement en attente depuis plus de 48 heures.";
      if (reason) {
        await rec.act("flag_order", { orderId: o.id, reason }, { summary: `Commande ${o.number} à vérifier`, rationale: reason });
        memory.flagged.push(o.id);
        findings.push(`Commande ${o.number} : ${reason}`);
      }
    }

    // 5. Alerte de synthèse à l'atelier
    if (findings.length) {
      let subject = `Atelier : ${findings.length} point(s) à regarder`;
      let body = findings.map((f) => `— ${f}`).join("\n\n");
      if (aiEnabled) {
        const msg = await generateStructured({
          instructions: "Mission : agent Commandes et stock. Rédigez pour la créatrice une alerte brève, claire et calme (pas de panique, pas de jargon) : objet de 8 mots maximum, puis les points classés du plus urgent au moins urgent, chacun avec l’action conseillée.",
          content: `Constats du jour :\n${findings.map((f) => `- ${f}`).join("\n")}`,
          schema: z.object({ subject: z.string(), body: z.string().describe("Paragraphes séparés par une ligne vide") }),
          effort: "low",
        });
        subject = msg.subject;
        body = msg.body;
      }
      await rec.act("alert_atelier", { subject, body }, { summary: subject });
    }
    await kv.set(MEMORY_KEY, { ...memory, flagged: memory.flagged.slice(-500), restocked: memory.restocked.slice(-500) });
    return rec.finish(findings.length ? `${findings.length} constat(s), alerte envoyée à l’atelier` : "Stocks et commandes en ordre");
  } catch (e) {
    rec.error(e);
    await kv.set(MEMORY_KEY, memory);
    return rec.finish("Passage interrompu");
  }
}
