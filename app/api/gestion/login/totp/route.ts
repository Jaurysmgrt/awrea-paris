import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_LOGIN_GUARD as GUARD, clearPreAuth, hasPreAuth, setAdminCookie } from "@/lib/auth/admin";
import { verifyAdminCode } from "@/lib/auth/totp";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";

/** Étape 2 : code de l'application d'authentification (ou code de secours). */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  if (!(await hasPreAuth())) return NextResponse.json({ error: "Session expirée : saisissez à nouveau le mot de passe." }, { status: 401 });
  const parsed = z.object({ code: z.string().trim().min(6).max(12) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await verifyAdminCode(parsed.data.code))) {
    await loginGuard.fail("admin", ip, GUARD);
    return NextResponse.json({ error: "Code incorrect ou déjà utilisé." }, { status: 401 });
  }
  await loginGuard.reset("admin", ip, GUARD);
  await clearPreAuth();
  await setAdminCookie();
  await logAction({ agent: "rapport", kind: "sécurité", status: "info", summary: "Connexion à l’Atelier (double authentification)" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
