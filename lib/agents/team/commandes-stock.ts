/**
 * @deprecated L'agent « Commandes et stock » est devenu l'agent « Commandes et confection »
 * (lib/agents/team/commandes-confection.ts) avec le modèle « sur demande ». Ce fichier garde
 * l'ancien nom le temps que app/api/checkout/route.ts importe le nouveau ; il sera supprimé ensuite.
 */
export { runCommandesConfectionAgent as runCommandesStockAgent } from "./commandes-confection";
