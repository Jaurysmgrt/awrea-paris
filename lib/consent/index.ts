/**
 * Consentement aux cookies — logique partagée (navigateur et serveur).
 *
 * Le choix est mémorisé dans le cookie `awrea_consent`, au format compact
 *   2.<identifiant>.<audience><personnalisation><publicité>.<horodatage ms>.<version de la politique>
 * ex. « 2.k7f3q9x2.100.1760342400000.2026-10 ».
 * Il expire au bout de 13 mois (recommandation CNIL) : le bandeau réapparaît alors,
 * de même qu'à chaque nouvelle version de la politique cookies.
 * Chaque choix est aussi enregistré côté serveur comme preuve (voir lib/consent/store.ts).
 */
export const CONSENT_COOKIE = "awrea_consent";
/** à changer quand la politique cookies évolue de façon substantielle : le choix est redemandé */
export const CONSENT_POLICY_VERSION = "2026-10";
/** 13 mois */
export const CONSENT_MAX_AGE_DAYS = 395;
export const CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
/** évènement navigateur qui rouvre le gestionnaire (lien « Gérer mes cookies ») */
export const CONSENT_OPEN_EVENT = "awrea:cookies";

export type ConsentCategory = "necessary" | "analytics" | "personalization" | "advertising";
export type OptionalCategory = Exclude<ConsentCategory, "necessary">;
export type ConsentChoices = Record<OptionalCategory, boolean>;

export interface Consent extends ConsentChoices {
  id: string;
  /** horodatage du choix (ms) */
  date: number;
  policy: string;
}

export const OPTIONAL_CATEGORIES: OptionalCategory[] = ["analytics", "personalization", "advertising"];

export const NO_CHOICE: ConsentChoices = { analytics: false, personalization: false, advertising: false };
export const ALL_CHOICES: ConsentChoices = { analytics: true, personalization: true, advertising: true };

const PATTERN = /^2\.([A-Za-z0-9_-]{6,40})\.([01])([01])([01])\.(\d{10,14})\.([A-Za-z0-9_-]{1,20})$/;

export function encodeConsent(c: Consent): string {
  const bit = (b: boolean) => (b ? "1" : "0");
  return `2.${c.id}.${bit(c.analytics)}${bit(c.personalization)}${bit(c.advertising)}.${c.date}.${c.policy}`;
}

/** Lit la valeur du cookie ; renvoie null si absente, illisible, expirée (13 mois) ou d'une ancienne politique. */
export function parseConsent(raw: string | null | undefined, now = Date.now()): Consent | null {
  if (!raw) return null;
  const m = decodeURIComponent(raw).match(PATTERN);
  if (!m) return null;
  const date = Number(m[5]);
  if (!Number.isFinite(date) || now - date > CONSENT_MAX_AGE_MS || date - now > 24 * 60 * 60 * 1000) return null;
  if (m[6] !== CONSENT_POLICY_VERSION) return null;
  return { id: m[1], analytics: m[2] === "1", personalization: m[3] === "1", advertising: m[4] === "1", date, policy: m[6] };
}

export function newConsentId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 16);
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

/**
 * Script en ligne exécuté dans <head>, avant l'affichage : marque la page quand un choix valide
 * existe déjà, pour que le bandeau rendu côté serveur ne s'affiche pas du tout.
 */
export function consentHeadScript(): string {
  return [
    "document.documentElement.classList.add('js');",
    "try{",
    `var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=2\\.[A-Za-z0-9_-]+\\.[01]{3}\\.(\\d+)\\.([A-Za-z0-9_-]+)/);`,
    `if(m&&Date.now()-Number(m[1])<${CONSENT_MAX_AGE_MS}&&m[2]==='${CONSENT_POLICY_VERSION}')document.documentElement.dataset.consent='set'`,
    "}catch(e){}",
  ].join("");
}
