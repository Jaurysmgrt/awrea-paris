/**
 * Code à six chiffres redemandé pour un geste sensible de l'Atelier, la session ouverte ne suffisant
 * pas : ajouter ou retirer un accès (relecture de sécurité du 09/11), autoriser les envois réels des
 * parcours (réponse de la créatrice du 12/11). Le code est celui de la connexion, vérifié de la même
 * façon (lib/auth/accounts.ts : code de l'application d'authentification ou code de secours, jamais
 * deux fois le même) ; aucun autre mot de passe.
 *
 * Garde-fous, communs à ces gestes : les essais sont comptés avant la vérification (dix par
 * demi-heure, par compte comme par réseau, que rien ne remet à zéro) ; chaque échec s'inscrit au
 * journal de sécurité ; au dixième essai, ou au vingtième échec de la journée, toutes les sessions se
 * ferment et une alerte part à la titulaire du compte.
 */
import "server-only";
import { revokeAdminSessions } from "@/lib/auth/admin";
import { emailKey, getAccount, verifyAccountCode } from "@/lib/auth/accounts";
import { alertLocked, logSecurityEvent } from "@/lib/security/audit";
import { clientIp, hit, loginGuard } from "@/lib/security/rate-limit";

/** Essais de code pour ces gestes : comptés avant la vérification, jamais remis à zéro. */
export const GESTES = { limit: 10, windowSeconds: 30 * 60 };
/** Échecs sur une journée de session (12 h, sans fenêtre glissante à contourner) : au vingtième, tout se ferme. */
export const ECHECS = { limit: 20, windowSeconds: 12 * 60 * 60 };

export interface RefusCode {
  error: string;
  status: 401 | 429;
}

/**
 * Vérifie le code de la personne connectée (`me`) avant un geste. Rend `null` si le code est bon,
 * sinon le refus à renvoyer tel quel. `geste` nomme le geste dans le journal de sécurité.
 */
export async function verifierCodeGeste(req: Request, me: string, code: string, geste: string): Promise<RefusCode | null> {
  const ip = clientIp(req);
  if (await loginGuard.blocked("atelier-geste-echecs", emailKey(me), ECHECS)) return { error: "Trop de codes faux aujourd’hui : reconnectez-vous demain, ou demandez à l’autre administrateur.", status: 429 };
  const [parCompte, parReseau] = await Promise.all([hit("atelier-geste", emailKey(me), GESTES), hit("atelier-geste-ip", ip, GESTES)]);
  if (!parCompte.allowed || !parReseau.allowed) return { error: "Trop d’essais. Réessayez dans une demi-heure.", status: 429 };
  const compte = await getAccount(me);
  if (compte && (await verifyAccountCode(compte, code))) return null;
  await logSecurityEvent("admin_code_fail", req, ip, `${me} (${geste})`);
  const echecs = await loginGuard.fail("atelier-geste-echecs", emailKey(me), ECHECS);
  if (parCompte.count >= GESTES.limit || parReseau.count >= GESTES.limit || echecs >= ECHECS.limit) {
    await revokeAdminSessions();
    await alertLocked(me, req, ip);
  }
  return { error: "Code incorrect ou déjà utilisé. Attendez le code suivant de votre application d’authentification, puis réessayez.", status: 401 };
}
