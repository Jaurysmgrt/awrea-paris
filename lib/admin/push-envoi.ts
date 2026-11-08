/**
 * Envoi d'une notification aux appareils de l'Atelier (Web Push : contenu chiffré pour l'appareil,
 * signé par la clé VAPID de la Maison). Séparé du stockage pour être testé seul, avec un faux
 * service de notification (tests/unit/atelier-application.test.ts).
 *
 * Le contenu est chiffré par web-push (`generateRequestDetails`) ; l'envoi passe par `fetch`, avec
 * un délai court, sans suivre de redirection, et seulement vers un service de notification connu.
 * Un appareil que le service dit disparu (404, 410) est à oublier ; une erreur passagère (429, 5xx,
 * réseau) le garde.
 */
import webpush from "web-push";
import { contenuNotification, serviceAutorise, type NotificationAtelier, type TypeNotification } from "./application";

export type Abonnement = { endpoint: string; keys: { p256dh: string; auth: string } };
export type Vapid = { subject: string; publicKey: string; privateKey: string };
export type Resultat = "envoye" | "oublier" | "echec";

/** Une alerte de sécurité ou une intervention passe avant le reste, et reste valable moins longtemps. */
const URGENCE: Record<TypeNotification, "high" | "normal" | "low"> = { securite: "high", intervention: "high", commande: "high", validation: "normal", anomalie: "normal", erreur: "normal", taches: "low" };
const DUREE: Record<TypeNotification, number> = { securite: 6 * 3600, intervention: 24 * 3600, commande: 24 * 3600, validation: 48 * 3600, anomalie: 24 * 3600, erreur: 24 * 3600, taches: 12 * 3600 };

export async function envoyerA(
  abonnement: Abonnement,
  n: NotificationAtelier,
  opts: { base: string; vapid: Vapid; fetch?: typeof fetch; delaiMs?: number },
): Promise<Resultat> {
  if (!serviceAutorise(abonnement.endpoint)) return "oublier";
  let details: ReturnType<typeof webpush.generateRequestDetails>;
  try {
    details = webpush.generateRequestDetails(abonnement, contenuNotification(n, opts.base), { vapidDetails: opts.vapid, TTL: DUREE[n.type], urgency: URGENCE[n.type], contentEncoding: "aes128gcm" });
  } catch {
    // clés de l'appareil illisibles : l'abonnement ne servira jamais
    return "oublier";
  }
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(details.headers)) headers[k] = String(v);
  try {
    const res = await (opts.fetch ?? fetch)(details.endpoint, {
      method: "POST",
      headers,
      body: details.body ? new Uint8Array(details.body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(opts.delaiMs ?? 5000),
    });
    if (res.status >= 200 && res.status < 300) return "envoye";
    if (res.status === 404 || res.status === 410) return "oublier";
    return "echec";
  } catch {
    return "echec";
  }
}
