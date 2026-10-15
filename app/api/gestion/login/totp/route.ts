import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_LOGIN_GUARD as GUARD, clearPreAuth, preAuth, setAdminCookie } from "@/lib/auth/admin";
import { ACCOUNT_GUARD, emailKey, getAccount, saveAccount, verifyAccountCode } from "@/lib/auth/accounts";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";
import { alertLocked, logSecurityEvent, recordAdminLogin } from "@/lib/security/audit";

/** Étape 2 : code de l'application d'authentification (ou code de secours). */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  const pre = await preAuth();
  if (!pre || pre.stage !== "totp") return NextResponse.json({ error: "Session expirée : saisissez à nouveau votre adresse et votre mot de passe." }, { status: 401 });
  const key = emailKey(pre.email);
  if (await loginGuard.blocked("admin-compte", key, ACCOUNT_GUARD)) return NextResponse.json({ error: "Ce compte est bloqué pour une demi-heure après plusieurs essais. Un e-mail a été envoyé à son adresse." }, { status: 429 });
  const account = await getAccount(pre.email);
  const parsed = z.object({ code: z.string().trim().min(6).max(12) }).safeParse(await req.json().catch(() => null));
  if (!account || !parsed.success || !(await verifyAccountCode(account, parsed.data.code))) {
    await loginGuard.fail("admin", ip, GUARD);
    const fails = await loginGuard.fail("admin-compte", key, ACCOUNT_GUARD);
    await logSecurityEvent("admin_code_fail", req, ip, pre.email);
    if (account && fails === ACCOUNT_GUARD.limit) await alertLocked(account.email, req, ip);
    return NextResponse.json({ error: "Code incorrect ou déjà utilisé." }, { status: 401 });
  }
  await loginGuard.reset("admin", ip, GUARD);
  await loginGuard.reset("admin-compte", key, ACCOUNT_GUARD);
  await clearPreAuth();
  await setAdminCookie(account.email);
  const fresh = await getAccount(account.email);
  if (fresh) await saveAccount({ ...fresh, lastLoginAt: new Date().toISOString() });
  const { unusual } = await recordAdminLogin(req, ip, account.email);
  await logAction({
    agent: "systeme",
    kind: "sécurité",
    status: "info",
    summary: unusual ? `Connexion inhabituelle de ${account.email} à l’Atelier, alerte envoyée` : `Connexion de ${account.email} à l’Atelier`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
