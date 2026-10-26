/**
 * Site privé (interrupteur SITE_PRIVE=1) : tant que la Maison n'ouvre pas le site, seules les
 * personnes connectées à l'Atelier le voient, l'Atelier compris. Une visiteuse ne voit que la page
 * d'attente (/acces-prive), sans aucun contenu du site ; rien n'est indexé (robots.txt fermé, plan
 * du site et llms.txt vides, en-tête noindex sur chaque réponse). Les webhooks de Shopify et les
 * tâches planifiées continuent de fonctionner. Le jour de l'ouverture : retirer SITE_PRIVE.
 *
 * Module pur : proxy, pages et tests unitaires.
 */

/** Page d'attente montrée aux visiteuses tant que le site est privé. */
export const PRIVATE_PAGE = "/acces-prive";

export const sitePrive = (): boolean => process.env.SITE_PRIVE === "1";

/** Adresses (sans préfixe de langue) qui restent ouvertes à toutes quand le site est privé. */
export function openWhilePrivate(path: string): boolean {
  return path === PRIVATE_PAGE || path.startsWith("/api/webhooks/") || path.startsWith("/api/cron/");
}
