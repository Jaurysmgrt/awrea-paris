import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_LOGIN_GUARD as GUARD, adminPassword, checkSetupPassword, setPreAuthCookie } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, checkAccountPassword, emailKey, getAccount, hasTotp, hashPassword } from "@/lib/auth/accounts";
import { sessionsConfigured } from "@/lib/auth/session";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { alertLocked, logSecurityEvent } from "@/lib/security/audit";
import { verifyTurnstile } from "@/lib/security/turnstile";

/**
 * Étape 1 : adresse e-mail et mot de passe. Seuls les comptes autorisés passent. À la première
 * connexion d'un compte, le mot de passe d'installation ouvre la création du mot de passe
 * personnel. La session n'est ouverte qu'après la double authentification (étape 2).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  if (!sessionsConfigured()) return NextResponse.json({ error: "La clé des sessions n’est pas configurée (SESSION_SECRET, 32 caractères au moins)." }, { status: 503 });
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200), turnstile: z.string().max(2048).optional() })
    .safeParse(await req.json().catch(() => null));
  if (parsed.success && !(await verifyTurnstile(parsed.data.turnstile, req))) {
    return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Adresse ou mot de passe incorrect." }, { status: 401 });
  const { email, password } = parsed.data;
  const key = emailKey(email);
  if (await loginGuard.blocked("admin-compte", key, ACCOUNT_GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip, "compte bloqué");
    return NextResponse.json({ error: "Ce compte est bloqué pour une demi-heure après plusieurs essais. Un e-mail a été envoyé à son adresse." }, { status: 429 });
  }

  const account = await getAccount(email);
  let stage: "setup" | "enroll" | "totp" | null = null;
  if (account?.passwordHash) {
    if (await checkAccountPassword(account, password)) stage = hasTotp(account) ? "totp" : "enroll";
  } else if (account) {
    if (!adminPassword()) return NextResponse.json({ error: "Le mot de passe d’installation de l’Atelier n’est pas configuré (ATELIER_PASSWORD)." }, { status: 503 });
    if (checkSetupPassword(password)) stage = "setup";
  } else {
    await hashPassword(password); // même durée de réponse qu'un compte existant
  }

  if (!stage) {
    await loginGuard.fail("admin", ip, GUARD); // seuls les échecs comptent
    const fails = await loginGuard.fail("admin-compte", key, ACCOUNT_GUARD);
    await logSecurityEvent("admin_password_fail", req, ip);
    if (account && fails === ACCOUNT_GUARD.limit) await alertLocked(account.email, req, ip);
    return NextResponse.json({ error: "Adresse ou mot de passe incorrect." }, { status: 401 });
  }
  await logSecurityEvent("admin_password_ok", req, ip, email);
  await setPreAuthCookie(email, stage);
  return NextResponse.json({ ok: true, step: stage });
}
