/**
 * Suggestions d'adresses pendant la saisie (page de commande, adresses du compte).
 * - `ign` : Géoplateforme de l'IGN, service public gratuit (adresses françaises) ; seul le texte
 *   saisi est transmis, depuis le serveur, sans aucune donnée sur la cliente ;
 * - `mock` : quelques adresses de démonstration (ADDRESS_PROVIDER, lib/config/providers.ts).
 */
import "server-only";
import { providerOf } from "@/lib/config/providers";

export interface AddressSuggestion {
  label: string;
  line1: string;
  postalCode: string;
  city: string;
  country: string;
}

const DEMO: AddressSuggestion[] = [
  ["12 rue de la Paix", "75002", "Paris"],
  ["5 rue du Faubourg Saint-Honoré", "75008", "Paris"],
  ["18 rue Vieille du Temple", "75004", "Paris"],
  ["40 rue de Bretagne", "75003", "Paris"],
  ["9 place des Vosges", "75004", "Paris"],
  ["27 rue Oberkampf", "75011", "Paris"],
  ["3 cours Gambetta", "69003", "Lyon"],
  ["14 rue Paradis", "13001", "Marseille"],
  ["22 rue Sainte-Catherine", "33000", "Bordeaux"],
  ["8 rue Nationale", "59000", "Lille"],
].map(([line1, postalCode, city]) => ({ label: `${line1}, ${postalCode} ${city}`, line1, postalCode, city, country: "FR" }));

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function suggestAddresses(query: string, country = "FR"): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3 || country !== "FR") return [];
  if (providerOf("address") !== "ign") {
    const words = norm(q).split(/\s+/);
    return DEMO.filter((a) => words.every((w) => norm(a.label).includes(w))).slice(0, 5);
  }
  try {
    const url = `https://data.geopf.fr/geocodage/search?index=address&autocomplete=1&limit=5&q=${encodeURIComponent(q.slice(0, 120))}`;
    const res = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: { properties: { label: string; name?: string; postcode?: string; city?: string; type?: string } }[] };
    return (json.features ?? [])
      .filter((f) => f.properties.postcode && f.properties.city && f.properties.type !== "municipality")
      .map((f) => ({ label: f.properties.label, line1: f.properties.name ?? f.properties.label, postalCode: f.properties.postcode!, city: f.properties.city!, country: "FR" }));
  } catch {
    return []; // la saisie libre reste toujours possible
  }
}
