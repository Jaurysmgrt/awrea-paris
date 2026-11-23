/**
 * Délais de livraison, lus dans les réglages de la boutique (content/settings.ts, `shippingRates`,
 * seule source : jamais recopiés dans une page). Chaque mode y porte son délai en toutes lettres
 * (« 2 à 3 jours ouvrés après expédition », « 24 h après expédition ») ; ce module en tire les
 * nombres pour les redire dans la langue de la page, avec les modèles d'un document de contenu
 * (page Savoir-faire, bloc « Le temps de la création », cahier de la créatrice du 23/11). Un délai
 * illisible est rendu tel quel, jamais deviné.
 * Module pur : utilisable par les pages serveur comme par les tests unitaires.
 */
import { fill } from "@/lib/edition/fill";

export interface ModeLivraison {
  id: string;
  label: string;
  delay: string;
  zone: string;
  pickup?: boolean;
}

export type DelaiLu = { unite: "jours"; min: number; max: number } | { unite: "heures"; n: number };

/** Modèles d'un document de contenu : « {min} à {max} jours ouvrés », « {n} jours ouvrés »,
 * « 1 jour ouvré », « {n} h ». */
export interface ModelesDelaiLivraison {
  plage: string;
  fixe: string;
  un: string;
  heures: string;
}

/** « 2 à 3 jours ouvrés … » → 2 à 3 jours ; « 24 h … » → 24 heures ; sinon null. */
export function lireDelaiLivraison(delay: string): DelaiLu | null {
  const s = delay.replace(/[  ]/g, " ").trim();
  const plage = s.match(/^(\d+)\s*(?:à|-)\s*(\d+)\s*jours?\b/i);
  if (plage) {
    const [a, b] = [Number(plage[1]), Number(plage[2])];
    return { unite: "jours", min: Math.min(a, b), max: Math.max(a, b) };
  }
  const jours = s.match(/^(\d+)\s*jours?\b/i);
  if (jours) return { unite: "jours", min: Number(jours[1]), max: Number(jours[1]) };
  const heures = s.match(/^(\d+)\s*h(?:eures?)?\b/i);
  if (heures) return { unite: "heures", n: Number(heures[1]) };
  return null;
}

/** Délai d'un mode dans la langue de la page ; le texte des réglages s'il n'est pas lisible. */
export function delaiLivraisonTexte(delay: string, modeles: ModelesDelaiLivraison): string {
  const d = lireDelaiLivraison(delay);
  if (!d) return delay;
  if (d.unite === "heures") return fill(modeles.heures, { n: d.n });
  if (d.min === d.max) return d.min === 1 ? modeles.un : fill(modeles.fixe, { n: d.min });
  return fill(modeles.plage, { min: d.min, max: d.max });
}

/**
 * Modes de livraison prévus par les CGV (France métropolitaine, par transporteur, sans retrait),
 * avec leur nom dans la langue de la page (`noms`, par identifiant ; à défaut, celui des réglages)
 * et leur délai après l'expédition.
 */
export function modesDeLivraison(rates: readonly ModeLivraison[], noms: Record<string, string>, modeles: ModelesDelaiLivraison): { id: string; nom: string; delai: string }[] {
  return rates
    .filter((r) => r.zone === "FR" && !r.pickup)
    .map((r) => ({ id: r.id, nom: noms[r.id] ?? r.label, delai: delaiLivraisonTexte(r.delay, modeles) }));
}
