/**
 * Site privé (interrupteur SITE_PRIVE=1) : tant que la Maison n'ouvre pas le site, seules les
 * personnes connectées à l'Atelier le voient, l'Atelier compris. Une visiteuse ne voit que la page
 * d'attente (/acces-prive), sans aucun contenu du site ; rien n'est indexé (robots.txt fermé, plan
 * du site et llms.txt vides, en-tête noindex sur chaque réponse). Les webhooks signés (paiement) et
 * les tâches planifiées continuent de fonctionner. Le jour de l'ouverture : retirer SITE_PRIVE.
 *
 * Lien privé (choix de la créatrice du 01/11) : « …?cle=<SITE_PRIVE_CLE> » ouvre tout le site, sans
 * passer par l'Atelier, dans le navigateur où il est ouvert, pendant PREVIEW_MAX_AGE. La clé est
 * aussitôt retirée de l'adresse et remplacée par un cookie signé (PREVIEW_COOKIE) qui porte son
 * empreinte : changer SITE_PRIVE_CLE dans Vercel ferme d'un coup tous les accès déjà donnés. Le lien
 * n'ouvre ni l'Atelier ni l'Édition, et le site reste exclu des moteurs de recherche.
 *
 * Module sans Next.js : proxy, pages et tests unitaires.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { sign, verify } from "@/lib/auth/session";

/** Page d'attente montrée aux visiteuses tant que le site est privé. */
export const PRIVATE_PAGE = "/acces-prive";

export const sitePrive = (): boolean => process.env.SITE_PRIVE === "1";

/** Adresses (sans préfixe de langue) qui restent ouvertes à toutes quand le site est privé. */
export function openWhilePrivate(path: string): boolean {
  return path === PRIVATE_PAGE || path.startsWith("/api/webhooks/") || path.startsWith("/api/cron/");
}

/** Paramètre d'adresse du lien privé, et cookie qui garde l'accès ensuite. */
export const PREVIEW_PARAM = "cle";
export const PREVIEW_COOKIE = "awrea_apercu";
/** Durée de l'accès donné par le lien privé : 30 jours. */
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30;

/** Clé du lien privé, seulement si elle est trop longue pour être devinée (24 caractères au moins). */
export function previewKey(): string | null {
  const key = process.env.SITE_PRIVE_CLE?.trim();
  return key && key.length >= 24 ? key : null;
}

const digest = (s: string) => createHash("sha256").update(s).digest();
/** Empreinte de la clé portée par le cookie (jamais la clé elle-même). */
const fingerprint = (key: string) => digest(`apercu:${key}`).toString("base64url").slice(0, 22);

/** La clé reçue est-elle la bonne ? Comparaison en temps constant. */
export function isPreviewKey(given: string | null | undefined, key: string | null = previewKey()): boolean {
  if (!given || !key) return false;
  return timingSafeEqual(digest(given), digest(key));
}

/** Jeton signé du cookie d'accès, lié à la clé en vigueur. */
export function previewToken(key: string | null = previewKey()): string | null {
  return key ? sign({ apercu: fingerprint(key) }, PREVIEW_MAX_AGE) : null;
}

/** Le cookie ouvre-t-il le site ? Faux dès que la clé a changé ou qu'elle est retirée. */
export function isPreviewToken(token: string | null | undefined, key: string | null = previewKey()): boolean {
  if (!key) return false;
  return verify<{ apercu?: string }>(token)?.apercu === fingerprint(key);
}
