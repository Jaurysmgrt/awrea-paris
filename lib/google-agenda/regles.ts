/**
 * Google Agenda, connexion directe (cahier de l'Atelier du 10/11, § 2) : règles pures, sans
 * stockage ni session, testées par tests/unit/google-agenda.test.ts.
 *
 * - Connexion officielle OAuth 2.0, flux « application Web » de Google, avec un `state` signé
 *   (HMAC, SESSION_SECRET, dix minutes) et PKCE (S256). Le mot de passe Google ne passe jamais par
 *   le site : la créatrice le tape chez Google, et seulement chez Google.
 * - Une seule autorisation, la plus étroite qui permette de créer, modifier, supprimer et lire les
 *   événements des agendas dont le compte est propriétaire (documentation Google, « Choose Google
 *   Calendar API scopes ») : `calendar.events.owned`. La lecture des événements suffit à repérer les
 *   moments déjà pris, sans autorisation de plus.
 * - Le jeton de rafraîchissement est chiffré (AES-256-GCM) avec la clé GOOGLE_CALENDAR_TOKEN_KEY, ou
 *   à défaut une clé tirée de SESSION_SECRET ; il ne quitte jamais le serveur.
 * - Appels à Google par `fetch` depuis le serveur, sans bibliothèque.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sign, verify } from "@/lib/auth/session";
import { resolveService } from "@/lib/config/providers";
import type { Appointment } from "@/lib/appointments";

/** Points d'accès officiels (OAuth 2.0 pour applications Web, Calendar API v3). */
export const GOOGLE = {
  autorisation: "https://accounts.google.com/o/oauth2/v2/auth",
  jeton: "https://oauth2.googleapis.com/token",
  revocation: "https://oauth2.googleapis.com/revoke",
  evenements: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
} as const;

/** « See, create, change, and delete events on Google calendars you own » : rien d'autre. */
export const PORTEE = "https://www.googleapis.com/auth/calendar.events.owned";
export const FUSEAU = "Europe/Paris";
/** durée de vie d'une connexion commencée (state, PKCE) : dix minutes */
export const DUREE_FLUX = 10 * 60;

type Fetch = typeof fetch;
type Env = Record<string, string | undefined>;

export interface ConfigGoogle {
  clientId: string;
  clientSecret: string;
  /** clé dédiée au chiffrement du jeton (32 caractères au moins), sinon null */
  cle: string | null;
}

/** Réglages Google, ou null tant que la connexion n'est pas branchée (interrupteur GOOGLE_CALENDAR_PROVIDER). */
export function configGoogle(env: Env = process.env): ConfigGoogle | null {
  if (resolveService("googleAgenda", env).provider !== "google") return null;
  const cle = env.GOOGLE_CALENDAR_TOKEN_KEY?.trim() ?? "";
  return { clientId: env.GOOGLE_CALENDAR_CLIENT_ID!.trim(), clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET!.trim(), cle: cle.length >= 32 ? cle : null };
}

/** Erreur d'un échange avec Google, avec un message simple pour l'Atelier (jamais un jeton). */
export class ErreurGoogle extends Error {
  statut: number;
  code: string;
  /** l'accès a été retiré ou a expiré chez Google : il faut reconnecter */
  revoque: boolean;
  constructor(message: string, opts: { statut?: number; code?: string; revoque?: boolean } = {}) {
    super(message);
    this.name = "ErreurGoogle";
    this.statut = opts.statut ?? 0;
    this.code = opts.code ?? "";
    this.revoque = opts.revoque ?? false;
  }
}

// ------------------------------------------------------------------ PKCE et state
/** Vérificateur PKCE : 64 caractères au hasard (43 à 128 permis). */
export const nouveauVerifier = () => randomBytes(48).toString("base64url");
/** Défi S256 : BASE64URL(SHA256(vérificateur)), sans remplissage. */
export const challengeDe = (verifier: string) => createHash("sha256").update(verifier, "ascii").digest("base64url");

/**
 * Ce que le navigateur de la créatrice garde pendant la connexion (cookie chiffré, HttpOnly, dix
 * minutes, réservé à la route de l'Atelier) : le numéro de la connexion, le vérificateur PKCE, le
 * compte de l'Atelier qui l'a commencée, l'échéance.
 */
export interface FluxGoogle {
  n: string;
  v: string;
  e: string;
  x: number;
}

/** Nouvelle connexion : le flux à garder, le `state` signé et le défi PKCE à envoyer à Google. */
export function nouveauFlux(email: string, maintenant = Date.now(), duree = DUREE_FLUX): { flux: FluxGoogle; state: string; challenge: string } {
  const n = randomBytes(16).toString("base64url");
  const v = nouveauVerifier();
  const e = email.trim().toLowerCase();
  return { flux: { n, v, e, x: maintenant + duree * 1000 }, state: sign({ u: "google-agenda", n, e }, duree), challenge: challengeDe(v) };
}

/** Contenu d'un `state` signé par le site et encore valable, ou null (faux, altéré ou expiré). */
export function lireEtat(state: string | null | undefined): { n: string; e: string } | null {
  const p = verify<{ u?: string; n?: string; e?: string }>(state);
  return p?.u === "google-agenda" && p.n && p.e ? { n: p.n, e: p.e } : null;
}

const memes = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Retour de Google : accepté seulement avec un `state` signé par le site, encore valable, de la
 * connexion commencée dans ce navigateur (cookie), par le compte de l'Atelier connecté.
 */
export function verifierRetour(entree: { state?: string | null; flux: FluxGoogle | null; admin: string; maintenant?: number }): { ok: true; verifier: string } | { ok: false; raison: string } {
  const maintenant = entree.maintenant ?? Date.now();
  const refus = { ok: false as const, raison: "Le retour de Google n’a pas été reconnu. Recommencez la connexion depuis Rendez-vous." };
  if (!entree.flux || entree.flux.x < maintenant) return { ok: false, raison: "La connexion a pris plus de dix minutes. Recommencez-la depuis Rendez-vous." };
  const s = lireEtat(entree.state);
  if (!s || !memes(s.n, entree.flux.n)) return refus;
  const admin = entree.admin.trim().toLowerCase();
  if (s.e !== admin || entree.flux.e !== admin) return refus;
  return { ok: true, verifier: entree.flux.v };
}

/** Adresse de la page d'autorisation de Google (accès hors ligne, consentement redemandé). */
export function urlAutorisation(cfg: ConfigGoogle, opts: { redirectUri: string; state: string; challenge: string }): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: PORTEE,
    // jeton de rafraîchissement : la synchronisation continue sans la créatrice
    access_type: "offline",
    // un nouveau jeton de rafraîchissement à chaque connexion, même après une déconnexion
    prompt: "consent",
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE.autorisation}?${p.toString()}`;
}

// ------------------------------------------------------------------ jetons
export interface JetonsGoogle {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
}

const formulaire = (f: Fetch, url: string, champs: Record<string, string>) =>
  f(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(champs).toString(), cache: "no-store", signal: AbortSignal.timeout(10_000) });

const injoignable = () => new ErreurGoogle("Google ne répond pas pour l’instant. Réessayez dans un moment.", { code: "reseau" });

async function lireJetons(r: Response): Promise<JetonsGoogle> {
  const json = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string; scope?: string };
  if (!json.access_token) throw new ErreurGoogle("Google a répondu sans accès. Recommencez la connexion.", { statut: r.status, code: "sans-acces" });
  return { accessToken: json.access_token, expiresIn: Number(json.expires_in) || 3600, refreshToken: json.refresh_token || undefined, scope: String(json.scope ?? "") };
}

const codeErreur = async (r: Response) => String(((await r.json().catch(() => ({}))) as { error?: unknown }).error ?? "");

/** Échange du code d'autorisation (avec le vérificateur PKCE) contre les jetons. */
export async function echangerCode(cfg: ConfigGoogle, opts: { code: string; verifier: string; redirectUri: string }, f: Fetch = fetch): Promise<JetonsGoogle> {
  const r = await formulaire(f, GOOGLE.jeton, {
    code: opts.code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  }).catch(() => null);
  if (!r) throw injoignable();
  if (r.ok) return lireJetons(r);
  const code = await codeErreur(r);
  if (code === "invalid_client" || code === "unauthorized_client") throw new ErreurGoogle("Google ne reconnaît pas l’identifiant du site. Vérifiez GOOGLE_CALENDAR_CLIENT_ID et GOOGLE_CALENDAR_CLIENT_SECRET dans Vercel.", { statut: r.status, code });
  if (code === "redirect_uri_mismatch") throw new ErreurGoogle("L’adresse de retour déclarée chez Google ne correspond pas. Recopiez celle affichée dans Rendez-vous.", { statut: r.status, code });
  throw new ErreurGoogle("Google a refusé ce retour, sans doute trop ancien. Recommencez la connexion.", { statut: r.status, code: code || "refus" });
}

/** Nouveau jeton d'accès (une heure) à partir du jeton de rafraîchissement. */
export async function rafraichir(cfg: ConfigGoogle, refreshToken: string, f: Fetch = fetch): Promise<JetonsGoogle> {
  const r = await formulaire(f, GOOGLE.jeton, { client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "refresh_token", refresh_token: refreshToken }).catch(() => null);
  if (!r) throw injoignable();
  if (r.ok) return lireJetons(r);
  const code = await codeErreur(r);
  // jeton retiré par la titulaire, expiré (application en test chez Google : sept jours), ou compte fermé
  if (code === "invalid_grant") throw new ErreurGoogle("Google Agenda a retiré l’accès de ce site, ou il a expiré. Reconnectez Google Agenda.", { statut: r.status, code, revoque: true });
  if (code === "invalid_client" || code === "unauthorized_client") throw new ErreurGoogle("Google ne reconnaît plus l’identifiant du site. Vérifiez GOOGLE_CALENDAR_CLIENT_ID et GOOGLE_CALENDAR_CLIENT_SECRET dans Vercel.", { statut: r.status, code });
  throw new ErreurGoogle("Google n’a pas renouvelé l’accès pour l’instant. Nouvel essai bientôt.", { statut: r.status, code: code || "refus" });
}

/** Retire l'accès chez Google. Vrai si Google l'a retiré, ou si le jeton ne valait déjà plus rien. */
export async function revoquer(jeton: string, f: Fetch = fetch): Promise<boolean> {
  const r = await formulaire(f, GOOGLE.revocation, { token: jeton }).catch(() => null);
  if (!r) return false;
  if (r.ok) return true;
  return (await codeErreur(r)) === "invalid_token";
}

// ------------------------------------------------------------------ chiffrement du jeton
const cleDe = (secret: string) => createHash("sha256").update(`google-agenda:jeton:${secret}`).digest();

/** Chiffre une donnée (AES-256-GCM, vecteur aléatoire, étiquette d'authenticité). */
export function chiffrer(texte: string, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cleDe(secret), iv);
  const enc = Buffer.concat([c.update(texte, "utf8"), c.final()]);
  return ["g1", ...[iv, c.getAuthTag(), enc].map((b) => b.toString("base64url"))].join(".");
}

/** null si la donnée a été altérée, ou chiffrée avec une autre clé. */
export function dechiffrer(donnee: string | undefined | null, secret: string): string | null {
  try {
    const [v, iv, tag, enc] = (donnee ?? "").split(".");
    if (v !== "g1" || !iv || !tag || !enc) return null;
    const d = createDecipheriv("aes-256-gcm", cleDe(secret), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ événements
/**
 * Lien d'un rendez-vous avec son événement Google, gardé sur le rendez-vous. L'identifiant est
 * choisi par le site et enregistré avant tout envoi : un nouvel essai retrouve toujours le même
 * événement et le met à jour, au lieu d'en créer un second.
 */
export interface LienGoogle {
  eventId: string;
  /** l'événement existe chez Google */
  cree?: boolean;
  /** l'événement a été retiré de Google après l'annulation du rendez-vous */
  retire?: boolean;
  /** empreinte du rendez-vous au dernier envoi réussi */
  empreinte?: string;
  /** dernier envoi réussi */
  le?: string;
  /** raison du dernier essai manqué, en mots simples */
  erreur?: string;
  /** dernier essai manqué */
  essai?: string;
  /** rang de l'identifiant (l'événement supprimé dans Google est recréé sous un autre) */
  n?: number;
}

export type RendezVousGoogle = Pick<Appointment, "id" | "type" | "start" | "end" | "name" | "email" | "phone" | "message" | "status" | "videoUrl"> & { google?: LienGoogle };

/** Identifiant de l'événement : caractères permis par Google (a à v, 0 à 9), 32 signes. */
export const idEvenement = (rdv: string, n = 0) => createHash("sha256").update(`awrea:rendez-vous:${rdv}:${n}`).digest("hex").slice(0, 32);

/** Ce qui, s'il change, demande de mettre l'événement à jour (déplacement, coordonnées, notes…). */
export const empreinte = (a: RendezVousGoogle, libelle: string) =>
  createHash("sha256").update(JSON.stringify([libelle, a.start, a.end, a.name, a.email, a.phone ?? "", a.message ?? "", a.videoUrl ?? ""])).digest("base64url").slice(0, 22);

/** L'événement d'un rendez-vous : intitulé, heures de Paris, coordonnées utiles, notes, lien de l'appel. */
export function corpsEvenement(a: RendezVousGoogle, libelle: string) {
  const description = [
    `Cliente : ${a.name}`,
    `E-mail : ${a.email}`,
    a.phone ? `Téléphone : ${a.phone}` : "",
    a.message ? `Notes : ${a.message}` : "",
    a.videoUrl ? `Appel vidéo : ${a.videoUrl}` : "",
    `Référence : ${a.id}`,
  ].filter(Boolean);
  return {
    summary: `${a.name} · ${libelle}`,
    description: description.join("\n"),
    ...(a.videoUrl ? { location: a.videoUrl } : {}),
    start: { dateTime: a.start, timeZone: FUSEAU },
    end: { dateTime: a.end, timeZone: FUSEAU },
    status: "confirmed",
    transparency: "opaque",
    // agenda partagé : les autres voient « occupé », jamais la cliente
    visibility: "private",
    reminders: { useDefault: true },
    extendedProperties: { private: { awreaRendezVous: a.id } },
  };
}

export type Geste = "ecrire" | "retirer";

/** Ce qu'il reste à faire chez Google pour ce rendez-vous, ou null s'il est à jour. */
export function gesteGoogle(a: RendezVousGoogle, libelle: string, maintenant = new Date()): Geste | null {
  if (a.status === "annule") return a.google?.cree && !a.google.retire ? "retirer" : null;
  if (Date.parse(a.end) <= maintenant.getTime()) return null;
  const g = a.google;
  return g?.cree && !g.erreur && g.empreinte === empreinte(a, libelle) ? null : "ecrire";
}

export type EtatSynchro = "synchronise" | "en-attente" | "a-refaire";

export const LIBELLES_ETAT: Record<EtatSynchro, string> = { synchronise: "Synchronisé", "en-attente": "En attente", "a-refaire": "À refaire" };

/** État d'un rendez-vous dans Google Agenda, ou null s'il n'y a rien à montrer. */
export function etatSynchro(a: RendezVousGoogle, libelle: string, maintenant = new Date()): EtatSynchro | null {
  if (gesteGoogle(a, libelle, maintenant)) return a.google?.erreur ? "a-refaire" : "en-attente";
  return a.status === "confirme" && a.google?.cree ? "synchronise" : null;
}

/** Message simple d'une réponse refusée par l'API Google Agenda. */
export function messageAgenda(statut: number): string {
  if (statut === 401) return "Google Agenda a refusé l’accès. Reconnectez Google Agenda.";
  if (statut === 403) return "Google Agenda refuse pour l’instant (autorisation ou limite du jour).";
  if (statut === 429 || statut >= 500) return "Google Agenda est occupé pour l’instant. Nouvel essai demain matin, ou avec Réessayer.";
  return `Google Agenda a refusé l’événement (erreur ${statut}).`;
}

// ------------------------------------------------------------------ moments occupés
/** Décalage de Paris par rapport à UTC (minutes), à un instant donné. */
function decalageParis(at: Date): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: FUSEAU, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - at.getTime()) / 60_000);
}

/** Minuit à Paris d'un jour « AAAA-MM-JJ » (journées entières de l'agenda). */
export function minuitParis(jour: string): number {
  const [y, m, d] = jour.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - decalageParis(new Date(guess)) * 60_000;
}

interface EvenementLu {
  id?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

/**
 * Plages occupées d'une page d'événements : ni les événements annulés ou « disponible », ni ceux
 * que la créatrice a déclinés, ni les rendez-vous du site eux-mêmes (`propres`, déjà comptés).
 */
export function plagesOccupees(items: EvenementLu[], propres: Set<string>): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const ev of items) {
    if (ev.status === "cancelled" || ev.transparency === "transparent" || (ev.id && propres.has(ev.id))) continue;
    if (ev.attendees?.some((x) => x.self && x.responseStatus === "declined")) continue;
    const debut = ev.start?.dateTime ? Date.parse(ev.start.dateTime) : ev.start?.date ? minuitParis(ev.start.date) : NaN;
    const fin = ev.end?.dateTime ? Date.parse(ev.end.dateTime) : ev.end?.date ? minuitParis(ev.end.date) : NaN;
    if (Number.isFinite(debut) && Number.isFinite(fin) && fin > debut) out.push({ start: debut, end: fin });
  }
  return out;
}
