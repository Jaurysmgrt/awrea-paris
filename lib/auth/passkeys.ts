/**
 * Clés d'accès de l'Atelier (Face ID, empreinte, code de l'appareil), choix de la créatrice du
 * 02/11 : « une méthode plus simple pour se connecter ». La double authentification reste
 * obligatoire : une clé d'accès réunit deux facteurs en un geste, l'appareil qui garde la clé
 * privée (ce que l'on possède) et Face ID ou l'empreinte qui la déverrouille (ce que l'on est).
 * La vérification de l'utilisatrice est exigée à l'ajout comme à chaque connexion.
 *
 * - Ajout : depuis une session ouverte (mot de passe et code), Réglages › Sécurité › Face ID.
 * - Connexion : la page de l'Atelier propose « Entrer avec Face ID ». La clé est cherchée parmi les
 *   comptes autorisés seulement (ATELIER_ACCOUNTS) ; un compte retiré de la liste ne peut plus entrer.
 * - Chaque défi ne sert qu'une fois et vit cinq minutes ; la clé publique seule est conservée.
 * - Le mot de passe et le code restent possibles, en secours ; « Ce n'était pas moi » et la remise à
 *   zéro d'un compte effacent aussi ses clés.
 *
 * Une clé est liée à l'adresse du site (awrea-paris.vercel.app aujourd'hui) : avec un nouveau nom
 * de domaine, il faudra l'ajouter de nouveau.
 */
import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { kv } from "@/lib/store";
import { emailKey, getAccount, listAccounts, saveAccount, type AtelierAccount, type Passkey } from "./accounts";

const RP_NAME = "Atelier Awrea Paris";
const TIMEOUT = 5 * 60_000;
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64url");
const bytes = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/** Adresse du site vue par le navigateur : la clé y est liée (rpID) et l'origine est vérifiée. */
export function relyingParty(req: Request): { rpID: string; origin: string } {
  const url = new URL(req.url);
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0].trim();
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0].trim();
  return { rpID: host.replace(/:\d+$/, ""), origin: `${proto}://${host}` };
}

/** Un défi ne sert qu'une fois, même rejoué dans les cinq minutes. */
async function premiereFois(challenge: string): Promise<boolean> {
  return (await kv.incr(`atelier:pk:defi:${challenge.slice(0, 64)}`, TIMEOUT / 1000)) === 1;
}

/* ------------------------------------------------------------------ AJOUT */

export async function optionsAjout(account: AtelierAccount, req: Request) {
  const { rpID } = relyingParty(req);
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: account.email,
    userDisplayName: account.email,
    userID: new Uint8Array(Buffer.from(emailKey(account.email), "hex")),
    attestationType: "none",
    timeout: TIMEOUT,
    excludeCredentials: (account.passkeys ?? []).map((p) => ({ id: p.id, transports: p.transports as AuthenticatorTransportFuture[] | undefined })),
    // clé gardée par l'appareil (ou le trousseau iCloud, Google), déverrouillée par Face ID ou l'empreinte
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
}

export async function terminerAjout(email: string, response: RegistrationResponseJSON, challenge: string, req: Request, label: string): Promise<Passkey> {
  if (!(await premiereFois(challenge))) throw new Error("Ce défi a déjà servi.");
  const { rpID, origin } = relyingParty(req);
  const v = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  if (!v.verified) throw new Error("La clé n’a pas pu être vérifiée.");
  const account = await getAccount(email);
  if (!account) throw new Error("Compte introuvable.");
  const { credential } = v.registrationInfo;
  const cle: Passkey = { id: credential.id, publicKey: b64(credential.publicKey), counter: credential.counter, transports: credential.transports, label, createdAt: new Date().toISOString() };
  await saveAccount({ ...account, passkeys: [...(account.passkeys ?? []).filter((p) => p.id !== cle.id), cle] });
  return cle;
}

export async function retirerCle(email: string, id: string): Promise<boolean> {
  const account = await getAccount(email);
  if (!account?.passkeys?.some((p) => p.id === id)) return false;
  await saveAccount({ ...account, passkeys: account.passkeys.filter((p) => p.id !== id) });
  return true;
}

/* ------------------------------------------------------------------ CONNEXION */

/** Défi de connexion : sans nom de compte, l'appareil propose la clé qu'il garde pour ce site. */
export async function optionsConnexion(req: Request) {
  const { rpID } = relyingParty(req);
  return generateAuthenticationOptions({ rpID, userVerification: "required", timeout: TIMEOUT });
}

/** Compte autorisé qui porte cette clé, s'il y en a un. */
export async function compteDeLaCle(id: string): Promise<{ account: AtelierAccount; cle: Passkey } | null> {
  for (const account of await listAccounts()) {
    const cle = account.passkeys?.find((p) => p.id === id);
    if (cle) return { account, cle };
  }
  return null;
}

/** Vérifie la connexion ; renvoie l'adresse du compte, ou null (rien n'est dit de plus). */
export async function terminerConnexion(response: AuthenticationResponseJSON, challenge: string, req: Request): Promise<string | null> {
  const trouve = await compteDeLaCle(response.id);
  if (!trouve || !(await premiereFois(challenge))) return null;
  const { rpID, origin } = relyingParty(req);
  const { account, cle } = trouve;
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: { id: cle.id, publicKey: bytes(cle.publicKey), counter: cle.counter, transports: cle.transports as AuthenticatorTransportFuture[] | undefined },
  }).catch(() => null);
  if (!v?.verified) return null;
  const now = new Date().toISOString();
  await saveAccount({ ...account, lastLoginAt: now, passkeys: (account.passkeys ?? []).map((p) => (p.id === cle.id ? { ...p, counter: v.authenticationInfo.newCounter, lastUsedAt: now } : p)) });
  return account.email;
}
