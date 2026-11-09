/**
 * Notifications de l'application privée de l'Atelier : appareils enregistrés et envoi.
 *
 * - Un appareil s'enregistre depuis la page « Application » de l'Atelier, session ouverte (double
 *   authentification faite). Dix appareils au plus ; chacun choisit ce qui le prévient.
 * - Sans les clés VAPID (variables d'environnement, jamais dans le code), rien ne part et la page le
 *   dit : aucune notification simulée.
 * - « Fermer toutes les sessions » oublie aussi tous les appareils : un téléphone perdu ne reçoit
 *   plus rien.
 * - Prévenir la créatrice ne bloque jamais une commande ni un agent : l'envoi part après la réponse
 *   quand c'est possible, en quelques secondes au plus, et ses erreurs sont seulement consignées.
 */
import "server-only";
import { after } from "next/server";
import { kv } from "@/lib/store";
import { identity } from "@/content/brand/identity";
import { atelierBase, ATELIER_INTERNAL } from "@/lib/admin/path";
import { TYPES_NOTIFICATION, type NotificationAtelier, type TypeNotification } from "@/lib/admin/application";
import { envoyerA, type Abonnement, type Vapid } from "@/lib/admin/push-envoi";

const CLE = "atelier:appareils";
/** Ce qu'un nouvel appareil reçoit d'emblée : tout, sauf la fin de chaque passage des agents (à demander). */
const TYPES_PAR_DEFAUT = TYPES_NOTIFICATION.filter((t) => t !== "taches");
export const APPAREILS_MAX = 10;

export type Appareil = Abonnement & {
  id: string;
  nom: string;
  types: TypeNotification[];
  par: string;
  ajouteLe: string;
  dernierEnvoi?: string;
  dernierEchec?: string;
};

/** Ce que la page « Application » peut montrer d'un appareil (jamais ses clés). */
export type AppareilVisible = Pick<Appareil, "id" | "nom" | "types" | "ajouteLe" | "dernierEnvoi" | "dernierEchec"> & { finPoint: string };

export class PushError extends Error {}

function vapid(): Vapid | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || `mailto:${process.env.ATELIER_EMAIL || identity.email}` };
}

export function pushConfig(): { actif: boolean; clePublique: string | null } {
  const v = vapid();
  return { actif: Boolean(v), clePublique: v?.publicKey ?? null };
}

export async function appareils(): Promise<Appareil[]> {
  return (await kv.get<Appareil[]>(CLE).catch(() => null)) ?? [];
}

/** L'adresse technique d'un appareil n'est montrée qu'à qui l'a abonné (pour reconnaître « cet appareil »). */
const visible = (a: Appareil, moi?: string): AppareilVisible => ({ id: a.id, nom: a.nom, types: a.types, ajouteLe: a.ajouteLe, dernierEnvoi: a.dernierEnvoi, dernierEchec: a.dernierEchec, finPoint: !moi || a.par === moi ? a.endpoint : "" });

export async function appareilsVisibles(moi: string): Promise<AppareilVisible[]> {
  return (await appareils()).map((a) => visible(a, moi));
}

/** Enregistre (ou met à jour) l'abonnement de cet appareil ; garde ses réglages s'il est déjà connu. */
export async function enregistrerAppareil(abonnement: Abonnement, nom: string, par: string): Promise<AppareilVisible> {
  const liste = await appareils();
  const deja = liste.find((a) => a.endpoint === abonnement.endpoint);
  if (!deja && liste.length >= APPAREILS_MAX) throw new PushError(`Dix appareils reçoivent déjà les notifications. Retirez-en un avant d’ajouter celui-ci.`);
  const appareil: Appareil = deja ? { ...deja, keys: abonnement.keys, nom } : { ...abonnement, id: crypto.randomUUID(), nom, types: TYPES_PAR_DEFAUT, par, ajouteLe: new Date().toISOString() };
  await kv.set(CLE, [appareil, ...liste.filter((a) => a.endpoint !== abonnement.endpoint)]);
  return visible(appareil);
}

/** Abonnement renouvelé par le navigateur (service worker, `pushsubscriptionchange`) : ses propres appareils seulement. */
export async function remplacerAbonnement(ancien: string, abonnement: Abonnement, par: string): Promise<boolean> {
  const liste = await appareils();
  const a = liste.find((x) => x.endpoint === ancien);
  if (!a || a.par !== par) return false;
  await kv.set(CLE, liste.map((x) => (x.endpoint === ancien ? { ...x, ...abonnement } : x)));
  return true;
}

export async function changerTypes(id: string, types: TypeNotification[]): Promise<AppareilVisible> {
  const liste = await appareils();
  const a = liste.find((x) => x.id === id);
  if (!a) throw new PushError("Cet appareil ne reçoit plus les notifications.");
  const maj = { ...a, types: TYPES_NOTIFICATION.filter((t) => types.includes(t)) };
  await kv.set(CLE, liste.map((x) => (x.id === id ? maj : x)));
  return visible(maj);
}

export async function retirerAppareil(id: string): Promise<void> {
  await kv.set(CLE, (await appareils()).filter((a) => a.id !== id));
}

/** « Fermer toutes les sessions » : plus aucun appareil ne reçoit rien. */
export async function oublierTousLesAppareils(): Promise<void> {
  await kv.del(CLE).catch(() => {});
}

/** Personne retirée de l'Atelier : les appareils qu'elle avait abonnés ne reçoivent plus rien. */
export async function oublierAppareilsDe(email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const liste = await appareils();
  const reste = liste.filter((a) => a.par.trim().toLowerCase() !== e);
  if (reste.length !== liste.length) await kv.set(CLE, reste);
}

const baseAtelier = () => atelierBase() ?? ATELIER_INTERNAL;

/**
 * Envoie une notification aux appareils qui la veulent (ou à un seul, pour l'essai). Ne lève
 * jamais : renvoie seulement le nombre d'appareils prévenus.
 */
export async function notifierAtelier(n: NotificationAtelier, seulement?: string): Promise<number> {
  const v = vapid();
  if (!v) return 0;
  try {
    const liste = await appareils();
    const cibles = liste.filter((a) => (seulement ? a.id === seulement : a.types.includes(n.type)));
    if (!cibles.length) return 0;
    const resultats = await Promise.all(cibles.map((a) => envoyerA(a, n, { base: baseAtelier(), vapid: v })));
    const maintenant = new Date().toISOString();
    const parId = new Map(cibles.map((a, i) => [a.id, resultats[i]]));
    // relu juste avant d'écrire : un appareil retiré pendant l'envoi ne revient pas
    const actuelle = await appareils();
    await kv.set(
      CLE,
      actuelle
        .filter((a) => parId.get(a.id) !== "oublier")
        .map((a) => (parId.get(a.id) === "envoye" ? { ...a, dernierEnvoi: maintenant } : parId.get(a.id) === "echec" ? { ...a, dernierEchec: maintenant } : a)),
    );
    return resultats.filter((r) => r === "envoye").length;
  } catch (e) {
    console.error("[atelier/notifications]", e instanceof Error ? e.message : e);
    return 0;
  }
}

/**
 * Prévient la créatrice sans retarder ce qui se passe : après la réponse quand on est dans une
 * requête, tout de suite sinon. Ne lève jamais.
 */
export async function signaler(n: NotificationAtelier): Promise<void> {
  if (!vapid()) return;
  try {
    after(() => notifierAtelier(n).then(() => undefined));
  } catch {
    await notifierAtelier(n);
  }
}
