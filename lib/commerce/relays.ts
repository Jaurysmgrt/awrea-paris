/**
 * Points relais (Mondial Relay) pour la commande de démonstration. En production, le choix du point
 * relais se fait dans le paiement Shopify (application Mondial Relay, ACTIVATION.md) : aucune clé
 * n'est nécessaire ici. Les points simulés sont explicitement présentés comme tels.
 */
export interface RelayPoint {
  id: string;
  name: string;
  address: string;
  hours: string;
}

/** Trois points de démonstration autour d'un code postal (identifiants stables pour la vérification). */
export function relayPoints(zip: string, country: string): RelayPoint[] {
  const z = zip.replace(/\s/g, "").toUpperCase();
  if (!/^[0-9A-Z-]{4,10}$/.test(z)) return [];
  return [1, 2, 3].map((n) => ({
    id: `MR-${country}-${z}-${n}`,
    name: `Point relais de démonstration ${n}`,
    address: `${["Rue", "Avenue", "Place"][n - 1]} du relais ${n}, ${z}`,
    hours: n === 3 ? "Du mardi au samedi, 10 h – 19 h" : "Du lundi au samedi, 9 h – 19 h",
  }));
}

export const findRelay = (id: string, zip: string, country: string) => relayPoints(zip, country).find((r) => r.id === id) ?? null;
