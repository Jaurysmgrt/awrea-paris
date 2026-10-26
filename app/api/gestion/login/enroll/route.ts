import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { ADMIN_LOGIN_GUARD as GUARD, clearPreAuth, preAuth, setAdminCookie } from "@/lib/auth/admin";
import { confirmAccountEnrollment, getAccount, hasTotp, saveAccount, startAccountEnrollment } from "@/lib/auth/accounts";
import { palette } from "@/styles/tokens";
import { logAction } from "@/lib/agents/log";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";
import { logSecurityEvent, recordAdminLogin } from "@/lib/security/audit";

const expired = () => NextResponse.json({ error: "Session expirée : saisissez à nouveau votre adresse et votre mot de passe." }, { status: 401 });

/** Première connexion : QR code à scanner avec l'application d'authentification. */
export async function GET() {
  const pre = await preAuth();
  if (!pre || pre.stage !== "enroll") return expired();
  const account = await getAccount(pre.email);
  if (!account) return expired();
  if (hasTotp(account)) return NextResponse.json({ error: "La double authentification est déjà configurée pour ce compte." }, { status: 409 });
  const { secret, uri } = await startAccountEnrollment(account);
  const svg = await QRCode.toString(uri, { type: "svg", margin: 0, color: { dark: palette.ink, light: palette.ivory }, errorCorrectionLevel: "M" });
  return NextResponse.json({ svg, secret: secret.replace(/(.{4})/g, "$1 ").trim() });
}

/** Confirmation par un premier code : la session s'ouvre et les codes de secours sont remis. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) {
    await logSecurityEvent("admin_login_blocked", req, ip);
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }
  const pre = await preAuth();
  if (!pre || pre.stage !== "enroll") return expired();
  const account = await getAccount(pre.email);
  if (!account) return expired();
  const parsed = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null));
  const recovery = parsed.success ? await confirmAccountEnrollment(account, parsed.data.code) : null;
  if (!recovery) {
    await loginGuard.fail("admin", ip, GUARD);
    await logSecurityEvent("admin_code_fail", req, ip, "enrôlement");
    return NextResponse.json({ error: "Code incorrect. Vérifiez l’heure de votre téléphone et réessayez." }, { status: 400 });
  }
  await loginGuard.reset("admin", ip, GUARD);
  await clearPreAuth();
  await setAdminCookie(account.email);
  const fresh = await getAccount(account.email);
  if (fresh) await saveAccount({ ...fresh, lastLoginAt: new Date().toISOString() });
  await logSecurityEvent("admin_enrolled", req, ip, account.email);
  await recordAdminLogin(req, ip, account.email);
  await logAction({ agent: "systeme", kind: "sécurité", status: "done", summary: `Double authentification configurée pour ${account.email}` }).catch(() => {});
  return NextResponse.json({ ok: true, recoveryCodes: recovery });
}
