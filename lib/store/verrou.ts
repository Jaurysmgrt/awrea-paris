/**
 * Verrou court du stockage, qui attend son tour : deux écritures de la même liste ou de la même
 * commande ne s'écrasent jamais (webhooks de Stripe arrivés ensemble, deux clientes qui paient au
 * même moment). Le verrou expire seul après 15 secondes si un serveur s'arrête en le tenant.
 */
import { kv } from "@/lib/store";

export class VerrouOccupe extends Error {}

export async function avecVerrou<T>(cle: string, fn: () => Promise<T>, attenteMs = 8000): Promise<T> {
  const fin = Date.now() + attenteMs;
  while ((await kv.incr(`verrou:${cle}`, 15)) !== 1) {
    if (Date.now() > fin) throw new VerrouOccupe("Le stockage est occupé : réessayez dans un instant.");
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
  try {
    return await fn();
  } finally {
    await kv.del(`verrou:${cle}`).catch(() => {});
  }
}
