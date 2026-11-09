import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin, revokeAdminSessions, setAdminCookie } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, allowedEmails, emailKey, getAccount, resetAccount, supprimerCompte, verifyAccountCode } from "@/lib/auth/accounts";
import { ajouterPersonne, personneAjoutee, personnesAjoutees, renouvelerInvitation, retirerPersonne } from "@/lib/auth/personnes";
import { problemeAjout } from "@/lib/auth/personnes-regles";
import { oublierAppareilsDe } from "@/lib/admin/push";
import { atelierHref } from "@/lib/admin/path";
import { absolute } from "@/lib/seo/metadata";
import { logAction } from "@/lib/agents/log";
import { clientIp, hit, loginGuard } from "@/lib/security/rate-limit";
import { alertLocked, alertPersonne, logSecurityEvent } from "@/lib/security/audit";

/**
 * Les accès à l'Atelier (Réglages), demande de la créatrice du 09/11 : « deux administrateurs qui
 * peuvent tout gérer », sans passer par Vercel. Toute personne connectée peut ajouter un accès, donner
 * un nouveau code d'invitation, retirer un accès ajouté, ou remettre à zéro un compte de Vercel.
 *
 * Garde-fous (relecture de sécurité du 09/11) :
 * - chaque geste redemande son propre code à six chiffres (ou un code de secours) : une session
 *   ouverte et oubliée ne suffit pas. Les essais sont comptés avant la vérification (dix par demi-heure
 *   et par compte comme par réseau, que rien ne remet à zéro) ; au dixième, toutes les sessions se
 *   ferment et une alerte part ;
 * - aucun geste sur son propre accès ; les adresses de Vercel ne se retirent pas d'ici ; cinq
 *   personnes ajoutées au plus, revérifié sous verrou ;
 * - un ajout efface tout ancien compte de la même adresse (mot de passe, Face ID, appareils) ;
 * - retrait, nouveau code et remise à zéro ferment toutes les autres sessions (connexions à moitié
 *   faites comprises) et oublient les appareils notifiés de la personne ; qui fait le geste reste
 *   connecté ;
 * - chaque geste prévient tous les administrateurs (application, e-mail ; lien « Ce n'était pas
 *   moi » pour qui l'a fait seulement) et s'inscrit au journal ;
 * - le code d'invitation n'est montré qu'une fois, dans la réponse, et seule son empreinte est gardée.
 */
const Corps = z.object({
  action: z.enum(["ajouter", "nouveau-code", "retirer", "remettre-a-zero"]),
  email: z.string().trim().toLowerCase().email().max(200),
  code: z.string().trim().min(6).max(12),
});

/** Essais de code pour ces gestes : comptés avant la vérification, jamais remis à zéro. */
const GESTES = { limit: 10, windowSeconds: 30 * 60 };
/** Échecs sur une journée de session (12 h, sans fenêtre glissante à contourner) : au vingtième, tout se ferme. */
const ECHECS = { limit: 20, windowSeconds: 12 * 60 * 60 };

const refus = (error: string, status: number) => NextResponse.json({ error }, { status });

/** L'adresse où l'on se trouve : celle où Face ID fonctionnera aussi pour la personne invitée. */
function adresseAtelier(req: Request): string {
  const hote = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  const protocole = (req.headers.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return /^[a-z0-9.-]+(:\d+)?$/i.test(hote) ? `${protocole === "http" ? "http" : "https"}://${hote}${atelierHref("/")}` : absolute(atelierHref("/"));
}

/**
 * Ferme toutes les sessions, sauf celle de qui fait le geste : son cookie est signé avec la génération
 * rendue par l'incrément atomique (une fermeture lancée au même instant par quelqu'un d'autre la
 * ferme aussi).
 */
async function fermerLesAutresSessions(me: string) {
  await setAdminCookie(me, await revokeAdminSessions());
}

export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return refus("Non autorisé", 401);
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return refus("Adresse ou code illisible.", 400);
  const { action, code, email } = parsed.data;
  const ip = clientIp(req);
  if (action !== "ajouter" && email === me) return refus("Vous ne pouvez pas faire ce geste sur votre propre accès.", 400);

  // son propre code, à chaque geste ; l'essai compte avant la vérification
  if (await loginGuard.blocked("atelier-geste-echecs", emailKey(me), ECHECS)) return refus("Trop de codes faux aujourd’hui : reconnectez-vous demain, ou demandez à l’autre administrateur.", 429);
  const [parCompte, parReseau] = await Promise.all([hit("atelier-geste", emailKey(me), GESTES), hit("atelier-geste-ip", ip, GESTES)]);
  if (!parCompte.allowed || !parReseau.allowed) return refus("Trop d’essais. Réessayez dans une demi-heure.", 429);
  const compte = await getAccount(me);
  if (!compte || !(await verifyAccountCode(compte, code))) {
    await logSecurityEvent("admin_code_fail", req, ip, `${me} (accès)`);
    const echecs = await loginGuard.fail("atelier-geste-echecs", emailKey(me), ECHECS);
    if (parCompte.count >= GESTES.limit || parReseau.count >= GESTES.limit || echecs >= ECHECS.limit) {
      await revokeAdminSessions();
      await alertLocked(me, req, ip);
    }
    return refus("Code incorrect ou déjà utilisé. Attendez le code suivant de votre application d’authentification, puis réessayez.", 401);
  }

  if (action === "ajouter") {
    const vercel = allowedEmails();
    const probleme = problemeAjout(email, { vercel, ajoutees: await personnesAjoutees() });
    if (probleme) return refus(probleme, 400);
    // un ancien compte de cette adresse (retirée de Vercel, par exemple) ne rouvre jamais l'Atelier
    await supprimerCompte(email);
    await oublierAppareilsDe(email);
    await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
    const r = await ajouterPersonne(email, me, (ajoutees) => problemeAjout(email, { vercel, ajoutees }));
    if ("probleme" in r) return refus(r.probleme, 400);
    // d'anciennes sessions de cette adresse (retirée de Vercel sans fermer les sessions) ne reviennent pas
    await fermerLesAutresSessions(me);
    await alertPersonne("ajout", email, me, req, ip);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Accès ajouté pour ${email} par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true, email, invitation: r.code, expire: r.expire, adresse: adresseAtelier(req) });
  }

  if (action === "remettre-a-zero") {
    if (!allowedEmails().includes(email)) return refus("Pour une personne ajoutée depuis l’Atelier, donnez-lui un nouveau code d’invitation.", 400);
    await resetAccount(email);
    await oublierAppareilsDe(email);
    await fermerLesAutresSessions(me);
    await alertPersonne("remise", email, me, req, ip);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Compte ${email} remis à zéro par ${me} ; les autres sessions sont fermées` }).catch(() => {});
    return NextResponse.json({ ok: true, email });
  }

  if (!(await personneAjoutee(email))) return refus("Cet accès n’a pas été ajouté depuis l’Atelier : il se règle dans Vercel.", 400);

  if (action === "nouveau-code") {
    // l'ancien accès ne sert plus : mot de passe, double authentification, Face ID et notifications
    await resetAccount(email);
    await oublierAppareilsDe(email);
    const invitation = await renouvelerInvitation(email);
    if (!invitation) return refus("Cet accès n’existe plus.", 404);
    await fermerLesAutresSessions(me);
    await alertPersonne("invitation", email, me, req, ip);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Nouveau code d’invitation pour ${email}, donné par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true, email, invitation: invitation.code, expire: invitation.expire, adresse: adresseAtelier(req) });
  }

  // retirer : l'adresse ne passe plus à la requête suivante (lib/auth/admin.ts), son compte, ses clés
  // et ses appareils sont effacés, et toutes les autres sessions se ferment
  await retirerPersonne(email);
  await supprimerCompte(email);
  await oublierAppareilsDe(email);
  await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
  await fermerLesAutresSessions(me);
  await alertPersonne("retrait", email, me, req, ip);
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Accès de ${email} retiré par ${me}` }).catch(() => {});
  return NextResponse.json({ ok: true, email });
}
