/**
 * Registre des rôles de gestion quotidienne : identité, mission, autonomie, cadence, critique.
 * Un seul passage planifié par jour (/api/cron/equipe) lance les rôles dont c'est le jour ; chaque
 * rôle peut aussi être lancé à la main depuis l'Atelier › Équipe.
 */
import { kv } from "@/lib/store";
import { aiEnabled } from "@/lib/ai/client";
import { getLog, logAction } from "@/lib/agents/log";
import { getProposals } from "@/lib/agents/perform";
import { autonomies } from "@/lib/agents/autonomie";
import { AUTONOMIE_DE } from "@/lib/agents/policy";
import { controle } from "./controle";
import { isDue } from "./cadence";
export { isDue };
import { runGardienEditeur } from "./gardien-editeur";
import { runAvis, runLogistique, runRetours } from "./service";
import { runRendezVous } from "./agenda";
import { runSauvegarde } from "./sauvegarde";
import { runAntiFraude, runComptabilite } from "./finance";
import { runCercle, runPresse, runRgpd, runSurMesure } from "./relation";
import { runDrops, runProduction } from "./creation";
import { runAccessibilite, runInstagram, runPerformance, runPublicite } from "./visibilite";
import { runDesign } from "./design";
import { annoncer } from "@/lib/agents/progress";
import type { Cadence, RoleContext, RoleId, RoleOutcome, RoleReport } from "./types";

export interface RoleInfo {
  id: RoleId;
  name: string;
  mission: string;
  autonomy: string;
  cadence: Cadence;
  /** quand il passe, en mots */
  schedule: string;
  run?: (now: Date, ctx: RoleContext) => Promise<RoleOutcome>;
}

export const ROLES: RoleInfo[] = [
  { id: "gardien-editeur", name: "Gardien de l’éditeur", mission: "Repère les brouillons oubliés, les publications programmées du jour et les textes encore entre crochets, et corrige seul la typographie des pages en ligne et les descriptions de photo manquantes.", autonomy: "Corrige seul ce qui ne change pas le sens, sur le site en ligne. Chaque correction est une version de la page, annulable.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runGardienEditeur },
  { id: "avis", name: "Avis clientes", mission: "Publie les avis vérifiés sans souci, et vous présente ceux qui portent une photo ou signalent quelque chose.", autonomy: "Publie seul les avis sans photo ni souci. Les autres, et les réponses, restent vos décisions.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runAvis },
  { id: "retours", name: "Retours et échanges", mission: "Suit chaque retour, de la demande au remboursement, et rappelle à la cliente un retour dont le colis n’est pas arrivé après une semaine.", autonomy: "Envoie seul le rappel, une fois par retour. Tout remboursement vous est proposé.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runRetours },
  { id: "logistique", name: "Logistique", mission: "Vérifie que chaque pièce prête part vite et que les colis avancent, livrés en France métropolitaine en 5 à 10 jours ouvrés comme le prévoient les conditions générales de vente.", autonomy: "Signale seul les expéditions en retard.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runLogistique },
  { id: "anti-fraude", name: "Anti-fraude", mission: "Relève les commandes inhabituelles (adresses très éloignées, montants élevés pour une première commande, essais répétés).", autonomy: "Signale seul. Une annulation vous est toujours proposée.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runAntiFraude },
  { id: "comptabilite", name: "Comptabilité et TVA", mission: "Prépare l’export du mois, vérifie la suite des factures, suit le seuil de la franchise de TVA et le seuil européen des ventes à distance.", autonomy: "Prépare seul. Aucun paiement.", cadence: { kind: "mensuel", jour: 1 }, schedule: "Le premier de chaque mois", run: runComptabilite },
  { id: "rgpd", name: "Données personnelles", mission: "Suit les demandes d’accès et d’effacement, et les données à effacer au terme de leur durée de conservation.", autonomy: "Prépare seul. Tout effacement vous est proposé.", cadence: { kind: "hebdomadaire", jour: 1 }, schedule: "Chaque lundi", run: runRgpd },
  { id: "cercle", name: "Cercle", mission: "Repère les clientes fidèles qui entrent dans le Cercle et leur envoie le mot de bienvenue.", autonomy: "Accueille seul, au plus un e-mail par cliente et par semaine.", cadence: { kind: "hebdomadaire", jour: 2 }, schedule: "Chaque mardi", run: runCercle },
  { id: "drops", name: "Avant-premières", mission: "Vérifie, la semaine qui précède chaque avant-première, la page « Bientôt », ses pièces, ses dates et les inscrites.", autonomy: "Prévient seulement. L’envoi d’une lettre à toutes les inscrites vous est proposé.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runDrops },
  { id: "sur-mesure", name: "Sur mesure", mission: "Suit les demandes de sur mesure, du premier message au rendez-vous ; une demande restée un jour sans réponse reçoit un accusé avec le lien du rendez-vous.", autonomy: "Envoie seul l’accusé, une fois par demande. Le devis reste le vôtre.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runSurMesure },
  { id: "rendez-vous", name: "Rendez-vous", mission: "Rappelle la veille chaque rendez-vous à la cliente et vous donne le programme du jour.", autonomy: "Envoie seul les rappels.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runRendezVous },
  { id: "production", name: "Confection", mission: "Range les pièces à confectionner selon le délai de fabrication annoncé à chaque commande, et prévient quand ce délai se resserre ou qu’une commande tarde à entrer en confection.", autonomy: "Prévient seulement.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runProduction },
  { id: "presse", name: "Presse et influence", mission: "Trie les demandes de presse et de partenariat et prépare les réponses.", autonomy: "Prépare seul. Les prêts de pièces vous sont proposés.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runPresse },
  { id: "instagram", name: "Instagram", mission: "Vérifie que les publications de la semaine sont prêtes et que la boutique Instagram suit le catalogue.", autonomy: "Prépare seul.", cadence: { kind: "hebdomadaire", jour: 1 }, schedule: "Chaque lundi", run: runInstagram },
  { id: "publicite", name: "Publicité", mission: "Lit les résultats des campagnes et propose où mettre, ou ne plus mettre, l’argent.", autonomy: "Propose seulement : toute dépense passe par vous.", cadence: { kind: "hebdomadaire", jour: 1 }, schedule: "Chaque lundi", run: runPublicite },
  { id: "accessibilite", name: "Accessibilité", mission: "Relit le contrôle d’accessibilité de la nuit (contrastes, clavier, lecteurs d’écran) et dit ce qui a changé.", autonomy: "Prévient seulement.", cadence: { kind: "hebdomadaire", jour: 0 }, schedule: "Chaque dimanche", run: runAccessibilite },
  { id: "performance", name: "Performance", mission: "Suit la vitesse des pages et leur poids, et signale ce qui ralentit.", autonomy: "Prévient seulement.", cadence: { kind: "hebdomadaire", jour: 0 }, schedule: "Chaque dimanche", run: runPerformance },
  { id: "design", name: "Design", mission: "Relit chaque matin les pages du site comme une directrice artistique exigeante : page qui ne s’affiche plus, photo cassée ou sans description, titre principal en double ou absent, deux boutons qui se disputent une section, trop de texte avant le bouton d’une pièce, phrase répétée, menu trop long. Retient ce qui revient d’un jour à l’autre et le fait monter d’un cran, puis dit par quoi commencer.", autonomy: "Prévient seulement : il ne modifie rien sur le site.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runDesign },
  { id: "sauvegarde", name: "Sauvegarde", mission: "Vérifie chaque jour que la sauvegarde de la nuit a eu lieu et qu’elle se relit.", autonomy: "Prévient seulement.", cadence: { kind: "quotidien" }, schedule: "Chaque matin", run: runSauvegarde },
];

export const roleInfo = (id: string) => ROLES.find((r) => r.id === id);

const REPORT_KEY = (id: RoleId) => `roles:rapport:${id}`;

export async function runRole(id: RoleId, trigger: RoleReport["trigger"], now = new Date(), ctx: RoleContext = {}): Promise<RoleReport> {
  const info = roleInfo(id);
  if (!info?.run) throw new Error(`Rôle en préparation : ${info?.name ?? id}`);
  const since = new Date(now.getTime() - 1000).toISOString();
  const report: RoleReport = { role: id, at: now.toISOString(), mode: aiEnabled ? "claude" : "demo", trigger, resume: "", findings: [], actions: { done: 0, proposed: 0, failed: 0 }, controle: [], erreurs: [] };
  try {
    const out = await info.run(now, ctx);
    report.resume = out.resume;
    report.findings = out.findings;
    // passage suivi depuis l'Atelier : chaque relevé apparaît à l'écran (lib/agents/progress.ts)
    for (const f of out.findings) annoncer(f.titre, f.gravite === "info" ? "info" : "proposed");
  } catch (e) {
    report.erreurs.push(e instanceof Error ? e.message : String(e));
    report.resume = "Le passage s’est arrêté sur une erreur.";
  }
  const [proposals, log, reglages] = await Promise.all([getProposals(), getLog(300), autonomies()]);
  const coupees = Object.entries(AUTONOMIE_DE).filter(([, a]) => a && !reglages[a]).map(([k]) => k);
  const mine = log.filter((a) => a.agent === id && a.date >= since);
  report.actions = { done: mine.filter((a) => a.status === "done").length, proposed: mine.filter((a) => a.status === "proposed").length, failed: mine.filter((a) => a.status === "failed").length };
  annoncer("Le Contrôle relit le passage.");
  report.controle = controle(report, { since, role: id, proposals, log, coupees });
  for (const c of report.controle) annoncer(`Contrôle : ${c.titre}`, "info");
  await kv.set(REPORT_KEY(id), report);
  await logAction({ agent: id, kind: "passage", status: report.erreurs.length ? "failed" : "info", summary: `${info.name} : ${report.resume}`, detail: [...report.erreurs, ...report.controle.map((c) => `Contrôle : ${c.titre}`)].join("\n") || undefined });
  return report;
}

export async function lastReport(id: RoleId): Promise<RoleReport | null> {
  return kv.get<RoleReport>(REPORT_KEY(id)).catch(() => null);
}

/** Passage du matin : chaque rôle prêt dont c'est le jour. */
export async function runDueRoles(now = new Date(), ctx: RoleContext = {}): Promise<RoleReport[]> {
  const out: RoleReport[] = [];
  for (const r of ROLES) if (r.run && isDue(r.cadence, now)) out.push(await runRole(r.id, "cron", now, ctx));
  return out;
}
