/**
 * Noms des agents tels que l'Atelier les affiche (journal, validations, calendrier). Module pur,
 * utilisable dans le navigateur : les registres des agents (lib/agents) restent côté serveur. Les
 * pages serveur y ajoutent les noms des registres, agents et rôles quotidiens (`withRegistryNames`).
 *
 * Modèle de la Maison : chaque pièce est créée sur demande, sans stock. Les anciens identifiants
 * restent lisibles dans le journal (« commandes-stock » devient « Commandes et confection »,
 * « drops » devient « Avant-premières »).
 */
export const AGENT_NAMES: Record<string, string> = {
  catalogue: "Catalogue",
  "service-client": "Service client",
  "commandes-confection": "Commandes et confection",
  "commandes-stock": "Commandes et confection",
  seo: "SEO et visibilité IA",
  contenu: "Contenu",
  rapport: "Rapport",
  "avant-premieres": "Avant-premières",
  drops: "Avant-premières",
  systeme: "Atelier",
};

/** Noms connus complétés par ceux des registres (agents et rôles) ; les noms ci-dessus priment. */
export function withRegistryNames(list: { id: string; name: string }[]): Record<string, string> {
  return { ...Object.fromEntries(list.map((r) => [r.id, r.name])), ...AGENT_NAMES };
}

export const agentName = (id: string, names: Record<string, string> = AGENT_NAMES) => names[id] ?? id;
