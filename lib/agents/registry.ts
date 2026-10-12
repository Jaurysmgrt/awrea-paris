/** L'équipe d'agents : identité, mission, cadence, lancement. */
import type { AgentId } from "./log";
import type { AgentRun } from "./run";
import { runServiceClientAgent } from "./team/service-client";
import { runCommandesStockAgent } from "./team/commandes-stock";
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
    mission: "À partir de photos et de quelques notes, rédige la fiche produit complète (nom, description, matières, entretien, textes alternatifs, SEO) et la met en ligne.",
    autonomy: "Publie seul. Un prix modifié ensuite ou une suppression passent par vous.",
    schedule: "À la demande, depuis l’onglet Catalogue",
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
    id: "commandes-stock",
    name: "Commandes et stock",
    mission: "Surveille ventes et stocks, alerte en cas de rupture, prévient la liste d’attente, remet en stock les retours, signale les commandes bloquées.",
    autonomy: "Agit seul. Annulations et remboursements vous sont proposés.",
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
    mission: "Chaque lundi, vous envoie un résumé clair : ventes, pièces les plus vues, paniers abandonnés, recommandations.",
    autonomy: "Agit seul.",
    schedule: "Chaque lundi à 8 h",
    cron: "0 6 * * 1",
  },
];

export async function runAgent(id: string, opts: { origin: string; trigger: AgentRun["trigger"] }): Promise<AgentRun> {
  switch (id) {
    case "service-client":
      return runServiceClientAgent(opts.trigger);
    case "commandes-stock":
      return runCommandesStockAgent(opts.trigger);
    case "seo":
      return runSeoAgent(opts.origin, opts.trigger);
    case "contenu":
      return runContenuAgent(opts.trigger);
    case "rapport":
      return runRapportAgent(opts.trigger);
    default:
      throw new Error(`Agent inconnu ou non planifiable : ${id}`);
  }
}
