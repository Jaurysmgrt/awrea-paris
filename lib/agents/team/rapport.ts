/**
 * AGENT RAPPORT — chaque lundi : ventes de la semaine, pièces les plus vues, paniers abandonnés,
 * messages, actions des agents, validations en attente, et trois recommandations claires.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { listInbox } from "@/lib/inbox";
import { formatPrice } from "@/lib/format";
import { getLog } from "../log";
import { getProposals } from "../perform";
import { getAnalytics } from "../analytics";
import { RunRecorder, type AgentRun } from "../run";

const Out = z.object({
  subject: z.string().describe("Objet de l’e-mail, 8 mots maximum, avec le chiffre d’affaires de la semaine"),
  summary: z.string().describe("4 à 6 paragraphes courts séparés par une ligne vide : la semaine en une phrase, ventes, pièces et visites, clientes, ce que les agents ont fait, puis exactement 3 recommandations concrètes numérotées"),
});

export async function runRapportAgent(trigger: AgentRun["trigger"] = "cron"): Promise<AgentRun> {
  const rec = new RunRecorder("rapport", trigger);
  try {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const [orders, products, inbox, log, proposals, analytics] = await Promise.all([getOrders(), getAllProducts(), listInbox(500), getLog(500), getProposals(), getAnalytics()]);
    const week = orders.filter((o) => new Date(o.createdAt).getTime() >= since && !["refunded", "pending"].includes(o.status));
    const revenue = week.reduce((s, o) => s + o.total, 0);
    const pieces = week.reduce((s, o) => s + o.lines.reduce((n, l) => n + l.quantity, 0), 0);
    const sold = new Map<string, number>();
    week.forEach((o) => o.lines.forEach((l) => sold.set(l.title, (sold.get(l.title) ?? 0) + l.quantity)));
    const views = analytics.productViews.map((v) => ({ ...v, title: products.find((p) => p.handle === v.handle)?.title ?? v.handle })).slice(0, 5);
    const abandoned = analytics.abandonedCarts;
    const weekLog = log.filter((a) => new Date(a.date).getTime() >= since);
    const msgs = inbox.filter((m) => new Date(m.date).getTime() >= since);
    const pending = proposals.filter((p) => p.status === "pending");
    const lowStock = products.flatMap((p) => p.variants.filter((v) => v.quantity === 0 && !v.preorder).map((v) => `${p.title} ${v.size}`));

    const metrics: Record<string, string | number> = {
      "Chiffre d’affaires": formatPrice(revenue),
      Commandes: week.length,
      "Pièces vendues": pieces,
      "Panier moyen": week.length ? formatPrice(Math.round(revenue / week.length)) : "—",
      Visites: analytics.sessions,
      "Paniers abandonnés": `${abandoned.length} (${formatPrice(abandoned.reduce((s, a) => s + a.value, 0))})`,
      "Messages reçus": msgs.length,
      "Actions des agents": weekLog.filter((a) => a.status === "done").length,
      "Validations en attente": pending.length,
    };

    const facts = `Semaine du ${new Date(since).toLocaleDateString("fr-FR")} au ${new Date().toLocaleDateString("fr-FR")}
Ventes : ${week.length} commande(s), ${pieces} pièce(s), ${formatPrice(revenue)}. Pièces vendues : ${[...sold].map(([t, n]) => `${t} ×${n}`).join(", ") || "aucune"}.
Pièces les plus vues : ${views.map((v) => `${v.title} (${v.views} vues)`).join(", ")}.
Visites : ${analytics.sessions}. Sources : ${analytics.topSources.map((s) => `${s.source} ${Math.round(s.share * 100)} %`).join(", ")}.
Paniers abandonnés : ${abandoned.map((a) => `${a.items.join(" + ")} (${formatPrice(a.value)})`).join(" ; ") || "aucun"}.
Messages clientes : ${msgs.length} reçus, ${msgs.filter((m) => m.status === "answered").length} répondus automatiquement, ${msgs.filter((m) => m.status === "escalated" || m.status === "drafted").length} en attente de la créatrice.
Ruptures sans précommande : ${lowStock.join(", ") || "aucune"}.
Actions des agents : ${weekLog.filter((a) => a.status === "done").length} réalisées, ${pending.length} validation(s) en attente (${pending.map((p) => p.summary).join(" ; ") || "aucune"}).`;

    let out: z.infer<typeof Out>;
    if (aiEnabled) {
      out = await generateStructured({
        instructions: "Mission : agent Rapport. Rédigez pour la créatrice le rapport hebdomadaire : clair, chaleureux, factuel, sans jargon, en vous appuyant uniquement sur les chiffres fournis. Terminez par trois recommandations concrètes et réalisables cette semaine.",
        content: facts,
        schema: Out,
        effort: "medium",
      });
    } else {
      const top = views[0];
      out = {
        subject: `Votre semaine : ${formatPrice(revenue)}, ${week.length} commande(s)`,
        summary: [
          `Bonjour, voici votre semaine à l’atelier : ${week.length} commande(s) pour ${formatPrice(revenue)}, ${pieces} pièce(s) parties vers leurs nouvelles propriétaires.`,
          `${top ? `${top.title} reste la pièce la plus regardée (${top.views} vues).` : ""} ${analytics.sessions} visites cette semaine, dont près de la moitié depuis Instagram.`,
          `${abandoned.length} panier(s) abandonné(s), pour ${formatPrice(abandoned.reduce((s, a) => s + a.value, 0))}. ${msgs.length} message(s) de clientes reçus ; les questions courantes ont reçu une réponse automatique.`,
          `Les agents ont mené ${weekLog.filter((a) => a.status === "done").length} action(s) ; ${pending.length} validation(s) vous attendent dans le tableau de bord.`,
          `Trois recommandations :\n1. ${top ? `Mettre ${top.title} en avant dans la prochaine lettre.` : "Préparer la prochaine lettre."}\n2. ${lowStock.length ? `Décider du sort de ${lowStock[0]} : précommande ou série close.` : "Prévoir la prochaine série selon les pièces les plus vues."}\n3. ${pending.length ? "Traiter les validations en attente." : "Proposer des essayages à l’atelier aux clientes hésitantes."}`,
        ].join("\n\n"),
      };
    }
    await rec.act("send_report", { subject: out.subject, summary: out.summary, metrics }, { summary: `Rapport hebdomadaire : ${out.subject}` });
    return rec.finish(`Rapport envoyé — ${formatPrice(revenue)}, ${week.length} commande(s)`);
  } catch (e) {
    rec.error(e);
    return rec.finish("Passage interrompu");
  }
}
