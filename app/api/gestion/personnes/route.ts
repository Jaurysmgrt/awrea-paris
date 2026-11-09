import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin, revokeAdminSessions } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, allowedEmails, emailKey, getAccount, proprietaire, resetAccount, supprimerCompte, verifyAccountCode } from "@/lib/auth/accounts";
import { ajouterPersonne, personneAjoutee, personnesAjoutees, renouvelerInvitation, retirerPersonne } from "@/lib/auth/personnes";
import { normaliserEmail, problemeAjout } from "@/lib/auth/personnes-regles";
import { oublierAppareilsDe } from "@/lib/admin/push";
import { atelierHref } from "@/lib/admin/path";
import { absolute } from "@/lib/seo/metadata";
import { logAction } from "@/lib/agents/log";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { alertPersonne, logSecurityEvent } from "@/lib/security/audit";

/**
 * Les personnes de l'Atelier (Réglages), demande de la créatrice du 09/11 : ajouter une personne,
 * lui donner un nouveau code d'invitation, la retirer, sans passer par Vercel.
 *
 * Garde-fous :
 * - la propriétaire seule (première adresse de ATELIER_ACCOUNTS), jamais une personne ajoutée ;
 * - chaque geste redemande le code à six chiffres de sa double authentification (ou un code de
 *   secours) : une session ouverte et oubliée ne suffit pas ; cinq codes faux bloquent son compte
 *   une demi-heure, comme à la connexion ;
 * - les adresses de Vercel ne se retirent pas d'ici ; cinq personnes ajoutées au plus ;
 * - chaque geste prévient la propriétaire (e-mail, application) et s'inscrit au journal ;
 * - le code d'invitation n'est montré qu'une fois, dans la réponse, et seule son empreinte est gardée.
 */
const Corps = z.object({
  action: z.enum(["ajouter", "nouveau-code", "retirer"]),
  email: z.string().trim().max(200),
  code: z.string().trim().min(6).max(12),
});

const refus = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return refus("Non autorisé", 401);
  if (me !== proprietaire()) return refus("Seule la propriétaire de l’Atelier peut ajouter ou retirer une personne.", 403);
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return refus("Adresse ou code illisible.", 400);
  const { action, code } = parsed.data;
  const email = normaliserEmail(parsed.data.email);
  const ip = clientIp(req);

  // le code de la propriétaire, à chaque geste
  const cle = emailKey(me);
  if (await loginGuard.blocked("admin-compte", cle, ACCOUNT_GUARD)) return refus("Trop de codes faux : votre compte est bloqué une demi-heure.", 429);
  const compte = await getAccount(me);
  if (!compte || !(await verifyAccountCode(compte, code))) {
    await loginGuard.fail("admin-compte", cle, ACCOUNT_GUARD);
    await logSecurityEvent("admin_code_fail", req, ip, `${me} (personnes)`);
    return refus("Code incorrect ou déjà utilisé. Attendez le code suivant de votre application d’authentification, puis réessayez.", 401);
  }

  // l'adresse où la propriétaire se trouve (awrea-paris.vercel.app aujourd'hui, le nom de domaine
  // plus tard) : celle où Face ID fonctionnera aussi pour la personne invitée
  const hote = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  const protocole = (req.headers.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  const adresse = /^[a-z0-9.-]+(:\d+)?$/i.test(hote) ? `${protocole === "http" ? "http" : "https"}://${hote}${atelierHref("/")}` : absolute(atelierHref("/"));

  if (action === "ajouter") {
    const probleme = problemeAjout(email, { vercel: allowedEmails(), ajoutees: await personnesAjoutees() });
    if (probleme) return refus(probleme, 400);
    const invitation = await ajouterPersonne(email, me);
    await alertPersonne("ajout", email, me, req, ip);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `${email} ajoutée à l’Atelier par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true, email, invitation: invitation.code, expire: invitation.expire, adresse });
  }

  if (!(await personneAjoutee(email))) return refus("Cette personne n’a pas été ajoutée depuis l’Atelier : son accès se règle dans Vercel.", 400);

  if (action === "nouveau-code") {
    // son ancien accès ne sert plus : mot de passe, double authentification et Face ID à refaire
    const avant = await getAccount(email);
    await resetAccount(email);
    const invitation = await renouvelerInvitation(email);
    if (!invitation) return refus("Cette personne n’existe plus.", 404);
    // ses sessions ouvertes se ferment (toutes les sessions : on se reconnecte d'un geste)
    if (avant?.passwordHash) await revokeAdminSessions();
    await alertPersonne("invitation", email, me, req, ip);
    await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Nouveau code d’invitation pour ${email}, donné par ${me}` }).catch(() => {});
    return NextResponse.json({ ok: true, email, invitation: invitation.code, expire: invitation.expire, adresse });
  }

  // retirer : l'adresse ne passe plus à la requête suivante (lib/auth/admin.ts), son compte, ses clés
  // et ses appareils sont effacés
  await retirerPersonne(email);
  await supprimerCompte(email);
  await oublierAppareilsDe(email);
  await loginGuard.reset("admin-compte", emailKey(email), ACCOUNT_GUARD);
  await alertPersonne("retrait", email, me, req, ip);
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `${email} retirée de l’Atelier par ${me}` }).catch(() => {});
  return NextResponse.json({ ok: true, email });
}
