import { NextResponse } from "next/server";
import { z } from "zod";
import { adminPassword, preAuth, setPreAuthCookie } from "@/lib/auth/admin";
import { getAccount, hashPassword, passwordProblem, saveAccount } from "@/lib/auth/accounts";
import { clientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";

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
  await saveAccount({ ...account, passwordHash: await hashPassword(password), createdAt: account.createdAt || new Date().toISOString() });
  await logSecurityEvent("admin_password_set", req, clientIp(req), account.email);
  await setPreAuthCookie(account.email, "enroll");
  return NextResponse.json({ ok: true, step: "enroll" });
}
