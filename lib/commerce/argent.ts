/**
 * Gestes d'argent sur une commande (remboursement, annulation remboursée, remboursement d'un retour),
 * quel que soit le chemin : fiche de la commande dans l'Atelier, proposition d'un agent validée par
 * la créatrice, remboursement d'un retour. Un seul geste à la fois par commande (verrou partagé),
 * et une commande déjà remboursée en entier ne l'est jamais une seconde fois (marque gardée).
 *
 * Ces fonctions ne sont appelées que par les exécuteurs (lib/agents/actions.ts, après validation)
 * et par les gestes de la créatrice : jamais directement par l'assistant ni par un agent.
 */
import "server-only";
import { kv } from "@/lib/store";
import { prendreVerrou, rendreVerrou } from "@/lib/store/verrou";

export class ArgentError extends Error {}

const verrou = (orderId: string) => `argent:${orderId}`;
const marque = (orderId: string) => `commandes:rembourse:${orderId}`;

export async function sousVerrouArgent<T>(orderId: string, geste: () => Promise<T>): Promise<T> {
  // dix minutes au plus : un geste interrompu (serveur arrêté) ne bloque pas la commande au-delà
  const jeton = await prendreVerrou(verrou(orderId), 600_000);
  if (!jeton) throw new ArgentError("Un geste d’argent est déjà en cours sur cette commande. Patientez un instant, puis rechargez la page.");
  try {
    return await geste();
  } finally {
    await rendreVerrou(verrou(orderId), jeton);
  }
}

/** Un geste d'argent de l'Atelier est-il en cours sur cette commande ? (le verrou est tenu) */
export async function gesteEnCours(orderId: string): Promise<boolean> {
  const jeton = await prendreVerrou(verrou(orderId), 2_000);
  if (!jeton) return true;
  await rendreVerrou(verrou(orderId), jeton);
  return false;
}

export async function dejaRembourse(orderId: string): Promise<boolean> {
  return Boolean(await kv.get(marque(orderId)));
}

export async function marquerRembourse(orderId: string, detail: { montant: number; par: string }) {
  await kv.set(marque(orderId), { ...detail, at: new Date().toISOString() });
}
