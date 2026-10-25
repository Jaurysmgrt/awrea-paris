/**
 * AGENT RAPPORT — chaque lundi : ventes de la semaine, pièces les plus vues, paniers abandonnés,
 * messages, confections en cours (et en retard sur le délai annoncé), prix, délais et photos encore
 * provisoires, actions des agents, validations en attente, et trois recommandations claires.
 * Chaque pièce est créée sur demande : il n'y a ni stock ni rupture à rapporter.
 */
import * as z from "zod/v4";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { getAllProducts } from "@/lib/commerce";
import { getOrders } from "@/lib/commerce/orders";
import { listInbox } from "@/lib/inbox";
import { formatPrice } from "@/lib/format";
import { withStages } from "@/lib/store/order-stages";
import { getLog } from "../log";
import { catalogueReview, confectionAlerts } from "../confection";
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
    const [orders, products, inbox, log, proposals, analytics] = await Promise.all([getOrders().then(withStages), getAllProducts(), listInbox(500), getLog(500), getProposals(), getAnalytics()]);
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
    // pièces créées sur demande : on suit la confection et ce qui reste provisoire, jamais un stock
    const making = orders.filter((o) => o.status === "paid" || o.status === "in_production");
    const alerts = confectionAlerts(orders, products);
    const late = alerts.filter((a) => a.kind === "en-retard");
    const review = catalogueReview(products);

    const metrics: Record<string, string | number> = {
      "Chiffre d’affaires": formatPrice(revenue),
      Commandes: week.length,
      "Pièces vendues": pieces,
      "Panier moyen": week.length ? formatPrice(Math.round(revenue / week.length)) : "aucune commande",
      Visites: analytics.sessions,
      "Paniers abandonnés": `${abandoned.length} (${formatPrice(abandoned.reduce((s, a) => s + a.value, 0))})`,
      "Messages reçus": msgs.length,
      "En confection": making.length,
      "Confections en retard": late.length,
      "Actions des agents": weekLog.filter((a) => a.status === "done").length,
      "Validations en attente": pending.length,
    };

    const facts = `Semaine du ${new Date(since).toLocaleDateString("fr-FR")} au ${new Date().toLocaleDateString("fr-FR")}
Ventes : ${week.length} commande(s), ${pieces} pièce(s), ${formatPrice(revenue)}. Pièces vendues : ${[...sold].map(([t, n]) => `${t} ×${n}`).join(", ") || "aucune"}.
Pièces les plus vues : ${views.map((v) => `${v.title} (${v.views} vues)`).join(", ")}.
Visites : ${analytics.sessions}. Sources : ${analytics.topSources.map((s) => `${s.source} ${Math.round(s.share * 100)} %`).join(", ")}.
Paniers abandonnés : ${abandoned.map((a) => `${a.items.join(" + ")} (${formatPrice(a.value)})`).join(" ; ") || "aucun"}.
Messages clientes : ${msgs.length} reçus, ${msgs.filter((m) => m.status === "answered").length} répondus automatiquement, ${msgs.filter((m) => m.status === "escalated" || m.status === "drafted").length} en attente de la créatrice.
Commandes à confectionner : ${making.length}, dont ${late.length} en retard sur le délai annoncé${late.length ? ` (${late.map((a) => a.number).join(", ")})` : ""} et ${alerts.length - late.length} à surveiller.
Catalogue : ${products.length} pièce(s) ; prix provisoires ${review.prices}, délais provisoires ${review.leadTimes}, pièces aux photos provisoires ${review.photos}, fiches à compléter ${review.incomplete}.
Actions des agents : ${weekLog.filter((a) => a.status === "done").length} réalisées, ${pending.length} validation(s) en attente (${pending.map((p) => p.summary).join(" ; ") || "aucune"}).`;

    let out: z.infer<typeof Out>;
    if (aiEnabled) {
      out = await generateStructured({
        instructions: "Mission : agent Rapport. Vous écrivez à la créatrice le rapport de sa semaine. Des phrases simples et chaleureuses, sans jargon, avec les seuls chiffres fournis. Chaque pièce est créée sur demande par des artisans français : parlez de confection et de délais, jamais de stock ni de série. Terminez par trois recommandations numérotées, concrètes, faisables cette semaine. Ni tiret ni puce.",
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
          `${top ? `${top.title} reste la pièce la plus regardée (${top.views} vues).` : ""} ${analytics.sessions} visites cette semaine.`,
          `${abandoned.length} panier(s) abandonné(s), pour ${formatPrice(abandoned.reduce((s, a) => s + a.value, 0))}. ${msgs.length} message(s) de clientes reçus ; les questions courantes ont reçu une réponse automatique.`,
          `${making.length} commande(s) en confection${late.length ? `, dont ${late.length} en retard sur le délai annoncé` : ", toutes dans les délais annoncés"}. ${review.prices + review.leadTimes ? `${review.prices} prix et ${review.leadTimes} délai(s) restent provisoires.` : "Tous les prix et les délais sont confirmés."}`,
          `Les agents ont mené ${weekLog.filter((a) => a.status === "done").length} action(s) ; ${pending.length} validation(s) vous attendent dans le tableau de bord.`,
          `Trois recommandations :\n1. ${top ? `Mettre ${top.title} en avant dans la prochaine lettre.` : "Préparer la prochaine lettre."}\n2. ${late.length ? `Prendre des nouvelles de la commande ${late[0].number} auprès de l’artisan et valider le message préparé pour la cliente.` : review.prices + review.leadTimes ? "Confirmer les prix et les délais encore provisoires, dans les Validations." : review.incomplete ? "Donner les compositions et les conseils d’entretien qui manquent aux fiches." : "Préparer la prochaine lettre autour des pièces les plus vues."}\n3. ${pending.length ? "Traiter les validations en attente." : "Proposer des essayages à l’atelier aux clientes hésitantes."}`,
        ].join("\n\n"),
      };
    }
    await rec.act("send_report", { subject: out.subject, summary: out.summary, metrics }, { summary: `Rapport hebdomadaire : ${out.subject}` });
    return rec.finish(`Rapport envoyé, ${formatPrice(revenue)} pour ${week.length} commande(s)`);
  } catch (e) {
    rec.error(e);
    return rec.finish("Passage interrompu");
  }
}
