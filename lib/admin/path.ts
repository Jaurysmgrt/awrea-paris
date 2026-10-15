/**
 * Adresse de l'Atelier (tableau de bord et éditeur) : secrète, jamais liée depuis le site.
 *
 * Les pages vivent en interne sous /gestion et leur API sous /api/gestion ; le public n'y accède
 * jamais directement (réponse 404). On y entre seulement par l'adresse secrète ADMIN_PATH, que le
 * proxy réécrit vers les routes internes :
 *   ADMIN_PATH/commandes      → /gestion/commandes
 *   ADMIN_PATH/api/retours    → /api/gestion/retours
 *
 * En production, ADMIN_PATH est obligatoire et doit avoir la forme « /prive-<au moins 12 lettres ou
 * chiffres au hasard> » : le fichier robots.txt écarte « /prive- » des moteurs sans révéler la suite.
 * En développement et en démonstration, l'adresse par défaut reste /gestion.
 *
 * Ne jamais importer ce module dans un composant client : l'adresse ne doit apparaître dans aucun
 * fichier servi au public. Les composants de l'Atelier la reçoivent par `AtelierBase`.
 */
export const ATELIER_INTERNAL = "/gestion";
export const ATELIER_API_INTERNAL = "/api/gestion";
/** préfixe public, seul visible dans robots.txt */
export const ATELIER_PREFIX = "/prive-";
const SECRET_FORMAT = /^\/prive-[a-z0-9]{12,64}$/;

const isProduction = () => process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && Boolean(process.env.SHOPIFY_STORE_DOMAIN));

/** Adresse publique de l'Atelier, ou null si l'Atelier est fermé faute de réglage valable. */
export function atelierBase(): string | null {
  const raw = process.env.ADMIN_PATH?.trim().toLowerCase();
  if (raw) {
    const path = `/${raw.replace(/^\/+|\/+$/g, "")}`;
    if (SECRET_FORMAT.test(path)) return path;
    if (!isProduction() && /^\/[a-z0-9-]{3,64}$/.test(path)) return path;
    return null;
  }
  return isProduction() ? null : ATELIER_INTERNAL;
}

/** Vrai si l'adresse réglée a la forme secrète attendue en production. */
export const atelierPathIsSecret = () => SECRET_FORMAT.test(atelierBase() ?? "");

/** Lien vers une page de l'Atelier (« /commandes » → « /prive-…/commandes »). */
export function atelierHref(path = "/"): string {
  const base = atelierBase() ?? ATELIER_INTERNAL;
  return path === "/" || path === "" ? base : `${base}${path.startsWith("/") || path.startsWith("#") || path.startsWith("?") ? "" : "/"}${path}`;
}

/** Chemin interne correspondant à une adresse publique de l'Atelier (null si hors Atelier). */
export function toInternal(pathname: string, base: string): { internal: string; rest: string; api: boolean } | null {
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  const rest = pathname.slice(base.length) || "/";
  const api = rest === "/api" || rest.startsWith("/api/");
  const internal = api ? `${ATELIER_API_INTERNAL}${rest.slice(4)}` : `${ATELIER_INTERNAL}${rest === "/" ? "" : rest}`;
  return { internal, rest, api };
}

/** Routes internes atteintes directement (toujours refusées : 404). */
export const isInternalAtelierPath = (pathname: string) =>
  pathname === ATELIER_INTERNAL || pathname.startsWith(`${ATELIER_INTERNAL}/`) || pathname === ATELIER_API_INTERNAL || pathname.startsWith(`${ATELIER_API_INTERNAL}/`);

/** Adresse d'une route d'API de l'Atelier (« /retours » → « /prive-…/api/retours »). */
export function atelierApi(path: string): string {
  return `${atelierBase() ?? ATELIER_INTERNAL}/api${path.startsWith("/") ? "" : "/"}${path}`;
}
