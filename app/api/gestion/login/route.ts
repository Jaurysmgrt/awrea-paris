import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_LOGIN_GUARD as GUARD, adminPassword, checkPassword, setPreAuthCookie } from "@/lib/auth/admin";
import { isEnrolled } from "@/lib/auth/totp";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";

/**
 * Étape 1 : mot de passe. La session n'est ouverte qu'après la double authentification
 * (étape 2 : /api/gestion/login/totp, ou enrôlement à la première connexion).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  if (!adminPassword()) return NextResponse.json({ error: "Le mot de passe du tableau de bord n’est pas configuré (ATELIER_PASSWORD)." }, { status: 503 });
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    await loginGuard.fail("admin", ip, GUARD); // seuls les échecs comptent
    await logSecurityEvent("admin_password_fail", req, ip);
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await logSecurityEvent("admin_password_ok", req, ip);
  await setPreAuthCookie();
  return NextResponse.json({ ok: true, step: (await isEnrolled()) ? "totp" : "enroll" });
}
