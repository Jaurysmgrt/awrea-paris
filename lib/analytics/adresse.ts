/**
 * Adresse d'une page telle que les outils de mesure la reçoivent (components/analytics/Trackers.tsx) :
 * sans le fragment (#…) ni les paramètres (?…), qui peuvent porter le jeton d'un lien envoyé par
 * e-mail ou le numéro d'une commande ; seuls les paramètres de campagne restent (origine d'une
 * visite, jamais une personne). Module pur, testé dans tests/unit/lettre-jetons.test.ts.
 */
const PARAMETRES_CAMPAGNE = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "ttclid", "msclkid"]);

export function adresseMesuree(href: string): string {
  const u = new URL(href);
  const gardes = [...u.searchParams].filter(([k]) => PARAMETRES_CAMPAGNE.has(k));
  const recherche = new URLSearchParams(gardes).toString();
  return `${u.origin}${u.pathname}${recherche ? `?${recherche}` : ""}`;
}
