/**
 * Règles des avant-premières, sans dépendance au serveur : partagées par lib/drops.ts (panier,
 * commande, pages), par la fiche d'une pièce (DropGateClient) et par les tests unitaires.
 *
 * Trois temps pour une collection annoncée sur la page « Bientôt » :
 *  - « bientot » : annoncée, personne ne commande encore ses pièces ;
 *  - « anticipe » : avant-première, à partir de earlyAccessAt, pour les personnes qui ont un accès
 *    (lien personnel des inscrites à la lettre, ou mot de passe d'une présentation privée) ;
 *  - « ouvert » : dévoilement à toutes, à partir de publicAt.
 * Chaque pièce est créée sur demande : aucune quantité, aucune rareté, seulement des dates.
 */

/** Textes des avant-premières (page « Bientôt », fiche d'une pièce, e-mails, Atelier). */
export type AvantPremieresTexts = typeof import("@/content/site/fr/avant-premieres.json");

export type DropPhase = "bientot" | "anticipe" | "ouvert";
/** « anticipe » : lien personnel de l'avant-première ; « prive » : mot de passe de la présentation privée. */
export type DropAccess = "anticipe" | "prive";

export interface DropTiming {
  /** ouverture de l'avant-première (ISO) */
  earlyAccessAt: string;
  /** dévoilement à toutes (ISO) */
  publicAt: string;
  /** présentation privée : l'avant-première passe par le mot de passe, jamais par le lien */
  privateSale: boolean;
}

export function phaseOf(d: Pick<DropTiming, "earlyAccessAt" | "publicAt">, at: number = Date.now()): DropPhase {
  if (at >= Date.parse(d.publicAt)) return "ouvert";
  if (at >= Date.parse(d.earlyAccessAt)) return "anticipe";
  return "bientot";
}

/** La visiteuse peut-elle commander les pièces de cette collection maintenant ? */
export function accessAllows(d: DropTiming, access: DropAccess | null | undefined, at: number = Date.now()): boolean {
  const phase = phaseOf(d, at);
  if (phase === "ouvert") return true;
  if (phase === "bientot" || !access) return false;
  return d.privateSale ? access === "prive" : true;
}

const PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Version anglaise (britannique) : « Thursday 5 November », « 6 pm », « 2.30 pm ». */
const PARIS_EN = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Date écrite en toutes lettres, heure de Paris : { jour: « jeudi 5 novembre », heure: « 18 h » }.
 * L'année n'est écrite que si elle diffère de l'année en cours ; « 1er » pour le premier du mois ;
 * espaces insécables entre le chiffre et le mois, et dans l'heure. En anglais (`locale` « en ») :
 * { jour: « Thursday 5 November », heure: « 6 pm » ou « 2.30 pm » }.
 */
export function parisDate(iso: string, now: number = Date.now(), locale: "fr" | "en" = "fr"): { jour: string; heure: string } {
  const format = locale === "en" ? PARIS_EN : PARIS;
  const parts = (d: Date) => {
    const all = format.formatToParts(d);
    return (type: Intl.DateTimeFormatPartTypes) => all.find((p) => p.type === type)?.value ?? "";
  };
  const g = parts(new Date(iso));
  const year = parts(new Date(now))("year");
  const minute = g("minute");
  const withYear = g("year") !== year ? ` ${g("year")}` : "";
  if (locale === "en") {
    return {
      jour: `${g("weekday")} ${g("day")} ${g("month")}${withYear}`,
      heure: `${Number(g("hour"))}${minute && minute !== "00" ? `.${minute}` : ""} ${g("dayPeriod").toLowerCase()}`,
    };
  }
  const day = g("day") === "1" ? "1er" : g("day");
  return {
    jour: `${g("weekday")} ${day} ${g("month")}${withYear}`,
    heure: `${Number(g("hour"))} h${minute && minute !== "00" ? ` ${minute}` : ""}`,
  };
}

/** Images de la collection : celles choisies, ou celle des données enregistrées avant les images multiples. */
export function imagesOf(d: { images?: string[]; image?: string }): string[] {
  if (d.images?.length) return d.images;
  return d.image ? [d.image] : [];
}

/** Première lettre en capitale : une date seule sous son intitulé (« Jeudi 5 novembre à 18 h »). */
export const capitalized = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s);

/** Paragraphes d'un texte de présentation : une ligne vide en sépare deux. */
export const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
