/**
 * Règles des personnes ajoutées à l'Atelier depuis l'Atelier lui-même (demande de la créatrice du
 * 09/11 : « un bouton Ajouter une personne, pour ne plus passer par Vercel »). Module pur : aucune
 * lecture ni écriture, testé seul (tests/unit/personnes.test.ts) ; le stockage vit dans
 * lib/auth/personnes.ts, les droits et les alertes dans app/api/gestion/personnes/route.ts.
 *
 * - Les adresses réglées dans Vercel (ATELIER_ACCOUNTS) restent la base : elles ne se retirent pas
 *   depuis l'Atelier. Tous les administrateurs sont égaux : chacun peut ajouter ou retirer.
 * - Une personne ajoutée reçoit un code d'invitation à usage unique, valable 72 heures, à la place du
 *   mot de passe d'installation ; seule son empreinte (SHA-256) est conservée.
 * - Cinq personnes ajoutées au plus : un accès volé ne peut pas ouvrir l'Atelier à la terre entière.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PERSONNES_MAX = 5;
export const INVITATION_DUREE_MS = 72 * 60 * 60 * 1000;

export interface Personne {
  email: string;
  /** adresse de l'administrateur qui l'a ajoutée */
  ajouteePar: string;
  ajouteeLe: string;
  /** invitation en attente : empreinte du code (jamais le code) et date de fin */
  invitation?: { empreinte: string; expire: string };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normaliserEmail = (email: string) => email.trim().toLowerCase();

/** Raison de refuser un ajout, ou null s'il est possible. */
export function problemeAjout(email: string, { vercel, ajoutees }: { vercel: string[]; ajoutees: Personne[] }): string | null {
  const e = normaliserEmail(email);
  if (!EMAIL.test(e) || e.length > 200) return "Cette adresse e-mail n’est pas valide.";
  if (vercel.includes(e)) return "Cette adresse entre déjà dans l’Atelier.";
  if (ajoutees.some((p) => p.email === e)) return "Cette personne fait déjà partie de l’Atelier.";
  if (ajoutees.length >= PERSONNES_MAX) return `L’Atelier compte déjà ${PERSONNES_MAX} personnes ajoutées. Retirez-en une avant d’en ajouter une autre.`;
  return null;
}

/** Code d'invitation : 80 bits tirés au hasard, en quatre groupes faciles à dicter (« K7QD-M2XP-9RTA-4VHN »). */
export function nouveauCodeInvitation(): string {
  // alphabet de Crockford : 32 signes sans I, L, O ni U (rien ne se confond), tirage sans biais
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const octets = randomBytes(16);
  let brut = "";
  for (const o of octets) brut += alphabet[o & 31];
  return brut.match(/.{4}/g)!.join("-");
}

/** Le code tel qu'on le compare : lettres et chiffres seulement, en majuscules. */
export const normaliserCode = (code: string) => code.replace(/[^A-Z0-9]/gi, "").toUpperCase();

export const empreinteInvitation = (code: string) => createHash("sha256").update(`atelier-invitation:${normaliserCode(code)}`).digest("hex");

/** Le code correspond-il à l'invitation en attente, encore valable ? */
export function invitationAccepte(p: Personne | null | undefined, code: string, maintenant = Date.now()): boolean {
  if (!p?.invitation || Date.parse(p.invitation.expire) <= maintenant) return false;
  const brut = normaliserCode(code);
  if (brut.length !== 16) return false;
  const a = Buffer.from(empreinteInvitation(brut), "hex");
  const b = Buffer.from(p.invitation.empreinte, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Invitation fraîche pour une personne : le code (à montrer une fois) et ce qui est gardé. */
export function inviter(maintenant = Date.now()): { code: string; invitation: NonNullable<Personne["invitation"]> } {
  const code = nouveauCodeInvitation();
  return { code, invitation: { empreinte: empreinteInvitation(code), expire: new Date(maintenant + INVITATION_DUREE_MS).toISOString() } };
}
