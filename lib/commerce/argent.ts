/**
 * Gestes d'argent sur une commande (remboursement, annulation remboursée, remboursement d'un retour),
 * quel que soit le chemin : fiche de la commande dans l'Atelier, proposition d'un agent validée par
 * la créatrice, remboursement d'un retour. Un seul geste à la fois par commande (verrou partagé),
 * et une commande déjà remboursée en entier ne l'est jamais une seconde fois (marque gardée, qui ne
 * dépend pas de la fraîcheur des données de Shopify).
 *
 * Ces fonctions ne sont appelées que par les exécuteurs (lib/agents/actions.ts, après validation)
 * et par les gestes de la créatrice : jamais directement par l'assistant ni par un agent.
 */
import "server-only";
import { kv } from "@/lib/store";

export class ArgentError extends Error {}

const verrou = (orderId: string) => `commandes:argent:${orderId}`;
const marque = (orderId: string) => `commandes:rembourse:${orderId}`;

export async function sousVerrouArgent<T>(orderId: string, geste: () => Promise<T>): Promise<T> {
  if ((await kv.incr(verrou(orderId), 600)) !== 1) throw new ArgentError("Un geste d’argent est déjà en cours sur cette commande. Patientez un instant, puis rechargez la page.");
  try {
    return await geste();
  } finally {
    await kv.del(verrou(orderId)).catch(() => {});
  }
}

export async function dejaRembourse(orderId: string): Promise<boolean> {
  return Boolean(await kv.get(marque(orderId)));
}

export async function marquerRembourse(orderId: string, detail: { montant: number; par: string }) {
  await kv.set(marque(orderId), { ...detail, at: new Date().toISOString() });
}
