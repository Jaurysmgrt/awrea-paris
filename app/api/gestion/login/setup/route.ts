import { NextResponse } from "next/server";
import { z } from "zod";
import { adminPassword, preAuth, setPreAuthCookie } from "@/lib/auth/admin";
import { getAccount, hashPassword, passwordProblem, saveAccount } from "@/lib/auth/accounts";
import { consommerInvitation, personneAjoutee } from "@/lib/auth/personnes";
import { clientIp } from "@/lib/security/rate-limit";
import { alertInvitationUtilisee, logSecurityEvent } from "@/lib/security/audit";

/** Première connexion : la titulaire du compte choisit son mot de passe personnel. */
export async function POST(req: Request) {
  const pre = await preAuth();
  if (!pre || pre.stage !== "setup") return NextResponse.json({ error: "Session expirée : saisissez à nouveau votre adresse et le mot de passe." }, { status: 401 });
  const parsed = z.object({ password: z.string().max(200), confirm: z.string().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mot de passe illisible." }, { status: 400 });
  const { password, confirm } = parsed.data;
  if (password !== confirm) return NextResponse.json({ error: "Les deux mots de passe ne sont pas identiques." }, { status: 400 });
  const problem = passwordProblem(password, adminPassword());
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const account = await getAccount(pre.email);
  if (!account) return NextResponse.json({ error: "Compte non autorisé." }, { status: 403 });
  // un mot de passe déjà choisi ne se remplace pas par cette étape (deux onglets, ou un code
  // d'installation réutilisé) : il faut se reconnecter
  if (account.passwordHash) return NextResponse.json({ error: "Session expirée : ce compte a déjà son mot de passe, reconnectez-vous." }, { status: 409 });
  // personne ajoutée depuis l'Atelier : son invitation est consommée ici, une seule fois
  const invitee = await personneAjoutee(account.email);
  if (invitee && !(pre.inv && (await consommerInvitation(account.email, pre.inv)))) {
    return NextResponse.json({ error: "Ce code d’invitation a déjà servi ou a expiré. Demandez-en un nouveau." }, { status: 401 });
  }
  await saveAccount({ ...account, passwordHash: await hashPassword(password), createdAt: account.createdAt || new Date().toISOString() });
  await logSecurityEvent("admin_password_set", req, clientIp(req), account.email);
  if (invitee) await alertInvitationUtilisee(account.email, req, clientIp(req));
  await setPreAuthCookie(account.email, "enroll");
  return NextResponse.json({ ok: true, step: "enroll" });
}
