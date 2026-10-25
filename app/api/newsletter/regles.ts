/**
 * Règles des champs de la lettre de la Maison (maquette NEWSLETTER : Nom *, Prénom *, E-mail *,
 * Téléphone facultatif, case de consentement ; la version compacte du pied de page : E-mail et
 * consentement). Module pur, sans dépendance : le formulaire
 * (components/ui/NewsletterForm.tsx) s'en sert pour signaler une erreur avant l'envoi, la route
 * (route.ts) pour son schéma Zod. Le serveur reste seul juge.
 */

export type ChampLettre = "nom" | "prenom" | "email" | "telephone" | "consentement";

/** longueur maximale d'un nom ou d'un prénom */
export const NOM_MAX = 80;
/** longueur maximale d'une adresse e-mail (RFC 5321) */
export const EMAIL_MAX = 254;
/** longueur maximale d'un numéro saisi, espaces et séparateurs compris */
export const TELEPHONE_MAX = 24;

/** Numéro de téléphone : chiffres, espaces, points, tirets, parenthèses et « + » de l'indicatif ; 8 à 15 chiffres (E.164). */
export function telephoneValide(v: string): boolean {
  const t = v.trim();
  if (!t) return true; // champ facultatif
  if (t.length > TELEPHONE_MAX || !/^\(?\+?[\d\s.()-]+$/.test(t)) return false;
  const chiffres = t.replace(/\D/g, "").length;
  return chiffres >= 8 && chiffres <= 15;
}

/**
 * Numéro au format international E.164 (« +33699557443 »), demandé par Brevo, Klaviyo et Shopify ;
 * un numéro français à dix chiffres (« 06 99 55 74 43 ») prend l'indicatif +33. Null si le numéro
 * ne peut pas être converti sans deviner son pays.
 */
export function telephoneE164(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t || !telephoneValide(t)) return null;
  const chiffres = t.replace(/\D/g, "");
  if (t.startsWith("+")) return `+${chiffres}`;
  if (t.startsWith("00")) return `+${chiffres.slice(2)}`;
  if (/^0\d{9}$/.test(chiffres)) return `+33${chiffres.slice(1)}`;
  return null;
}

/** Adresse e-mail plausible (le serveur la vérifie à nouveau avec Zod). */
export const emailPlausible = (v: string) => v.trim().length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Nom ou prénom : présent, sans caractère de contrôle, pas trop long. */
export const nomValide = (v: string) => v.trim().length > 0 && v.trim().length <= NOM_MAX && !/[\u0000-\u001f\u007f<>]/.test(v);

/**
 * Champs en erreur d'une saisie, dans l'ordre du formulaire. Version compacte (pied de page) :
 * ni nom ni prénom, seulement l'e-mail et le consentement.
 */
export function champsEnErreur(s: { nom: string; prenom: string; email: string; telephone: string; consentement: boolean }, compacte = false): ChampLettre[] {
  const out: ChampLettre[] = [];
  if (!compacte && !nomValide(s.nom)) out.push("nom");
  if (!compacte && !nomValide(s.prenom)) out.push("prenom");
  if (!emailPlausible(s.email)) out.push("email");
  if (!telephoneValide(s.telephone)) out.push("telephone");
  if (!s.consentement) out.push("consentement");
  return out;
}
