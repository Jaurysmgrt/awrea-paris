/**
 * Verrou court du stockage, qui attend son tour : deux écritures de la même liste ou de la même
 * commande ne s'écrasent jamais (webhooks de Stripe arrivés ensemble, deux clientes qui paient au
 * même moment).
 *
 * Le verrou est posé d'un seul geste avec son expiration (SET NX PX) : il ne peut jamais rester
 * bloqué, et il expire seul si un serveur s'arrête en le tenant. Il porte un jeton propre à son
 * détenteur : un détenteur en retard ne rend jamais le verrou qu'un autre a pris entre-temps.
 */
import { randomUUID } from "node:crypto";
import { kv } from "@/lib/store";

export class VerrouOccupe extends Error {}

/** Prend le verrou `cle` pour `dureeMs`, ou renvoie null s'il est déjà pris. */
export async function prendreVerrou(cle: string, dureeMs: number): Promise<string | null> {
  const jeton = randomUUID();
  return (await kv.prendre(`verrou:${cle}`, jeton, dureeMs)) ? jeton : null;
}

export async function rendreVerrou(cle: string, jeton: string): Promise<void> {
  await kv.rendre(`verrou:${cle}`, jeton).catch(() => {});
}

export async function avecVerrou<T>(cle: string, fn: () => Promise<T>, attenteMs = 8000): Promise<T> {
  const fin = Date.now() + attenteMs;
  let jeton = await prendreVerrou(cle, 15_000);
  while (!jeton) {
    if (Date.now() > fin) throw new VerrouOccupe("Le stockage est occupé : réessayez dans un instant.");
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    jeton = await prendreVerrou(cle, 15_000);
  }
  try {
    return await fn();
  } finally {
    await rendreVerrou(cle, jeton);
  }
}
