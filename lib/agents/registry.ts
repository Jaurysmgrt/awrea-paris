/** L'équipe d'agents : identité, mission, cadence, lancement. */
import { currentAgentId, type AgentId } from "./log";
import type { AgentRun } from "./run";
import { runServiceClientAgent } from "./team/service-client";
import { runCommandesConfectionAgent } from "./team/commandes-confection";
import { runCatalogueReview } from "./team/catalogue";
import { runSeoAgent } from "./team/seo";
import { runContenuAgent } from "./team/contenu";
import { runRapportAgent } from "./team/rapport";

export interface AgentInfo {
  id: Exclude<AgentId, "systeme">;
  name: string;
  mission: string;
  autonomy: string;
  schedule: string;
  /** cron Vercel (UTC) — voir vercel.json */
  cron: string | null;
}

export const AGENTS: AgentInfo[] = [
  {
    id: "catalogue",
    name: "Catalogue",
    mission: "Connaît chaque pièce du catalogue, aujourd’hui la collection Hypnotic Lace. Fait le bilan des photos provisoires, des prix et des délais encore provisoires, et de ce qui manque aux fiches. Rédige une nouvelle fiche à partir de photos et de quelques notes.",
    autonomy: "Publie seul une nouvelle fiche. Un prix modifié ensuite ou une suppression passent par vous. N’invente ni matière ni entretien.",
    schedule: "À la demande : le bilan ici, une nouvelle fiche depuis l’onglet Catalogue",
    cron: null,
  },
  {
    id: "service-client",
    name: "Service client",
    mission: "Répond aux messages courants (tailles, livraison, suivi, entretien), prépare les réponses délicates et vous les escalade.",
    autonomy: "Répond seul aux questions courantes. Les remboursements vous sont proposés.",
    schedule: "À chaque nouveau message, et chaque jour à 9 h",
    cron: "0 7 * * *",
  },
  {
    id: "commandes-confection",
    name: "Commandes et confection",
    mission: "Suit chaque commande en confection face au délai annoncé. Vous prévient quand une date approche ou passe, prépare le message à la cliente quand un retard se dessine, et vous présente les prix et délais encore provisoires à confirmer.",
    autonomy: "Vous alerte seul. Le message à une cliente, la confirmation d’un prix ou d’un délai, les annulations et les remboursements vous sont proposés.",
    schedule: "À chaque commande, et chaque jour à 8 h",
    cron: "0 6 * * *",
  },
  {
    id: "seo",
    name: "SEO et visibilité IA",
    mission: "Audit hebdomadaire (pages lentes, balises, liens cassés), corrige les balises, publie un article du Journal, met à jour llms.txt.",
    autonomy: "Agit seul.",
    schedule: "Chaque dimanche à 5 h",
    cron: "0 3 * * 0",
  },
  {
    id: "contenu",
    name: "Contenu",
    mission: "Prépare des posts Instagram et une newsletter à partir des nouvelles pièces et collections, dans la direction artistique de la maison.",
    autonomy: "Prépare seul. L’envoi de la newsletter à toute la liste vous est proposé.",
    schedule: "Chaque mercredi à 9 h",
    cron: "0 7 * * 3",
  },
  {
    id: "rapport",
    name: "Rapport",
    mission: "Chaque lundi, vous envoie un résumé clair : ventes, pièces les plus vues, paniers abandonnés, recommandations.",
    autonomy: "Agit seul.",
    schedule: "Chaque lundi à 8 h",
    cron: "0 6 * * 1",
  },
];

/** Agent de l'équipe, y compris sous un identifiant retiré (« commandes-stock ») encore présent dans un journal. */
export const agentInfo = (id: string) => AGENTS.find((a) => a.id === currentAgentId(id));

/**
 * Lance un agent. L'ancien identifiant « commandes-stock » (tâche planifiée de vercel.json, bouton
 * de l'onglet Commandes) lance l'agent « Commandes et confection ».
 */
export async function runAgent(id: string, opts: { origin: string; trigger: AgentRun["trigger"] }): Promise<AgentRun> {
  switch (currentAgentId(id)) {
    case "catalogue":
      return runCatalogueReview(opts.trigger);
    case "service-client":
      return runServiceClientAgent(opts.trigger);
    case "commandes-confection":
      return runCommandesConfectionAgent(opts.trigger);
    case "seo":
      return runSeoAgent(opts.origin, opts.trigger);
    case "contenu":
      return runContenuAgent(opts.trigger);
    case "rapport":
      return runRapportAgent(opts.trigger);
    default:
      throw new Error(`Agent inconnu ou non planifiable : ${id}`);
  }
}
