import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { clearPreAuth, hasPreAuth, setAdminCookie } from "@/lib/auth/admin";
import { confirmEnrollment, isEnrolled, startEnrollment } from "@/lib/auth/totp";
import { palette } from "@/styles/tokens";
import { logAction } from "@/lib/agents/log";

/** Première connexion : QR code à scanner avec l'application d'authentification. */
export async function GET() {
  if (!(await hasPreAuth())) return NextResponse.json({ error: "Session expirée : saisissez à nouveau le mot de passe." }, { status: 401 });
  if (await isEnrolled()) return NextResponse.json({ error: "La double authentification est déjà configurée." }, { status: 409 });
  const { secret, uri } = await startEnrollment();
  const svg = await QRCode.toString(uri, { type: "svg", margin: 0, color: { dark: palette.ink, light: palette.ivory }, errorCorrectionLevel: "M" });
  return NextResponse.json({ svg, secret: secret.replace(/(.{4})/g, "$1 ").trim() });
}

/** Confirmation par un premier code : la session s'ouvre et les codes de secours sont remis. */
export async function POST(req: Request) {
  if (!(await hasPreAuth())) return NextResponse.json({ error: "Session expirée : saisissez à nouveau le mot de passe." }, { status: 401 });
  const parsed = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).safeParse(await req.json().catch(() => null));
  const recovery = parsed.success ? await confirmEnrollment(parsed.data.code) : null;
  if (!recovery) return NextResponse.json({ error: "Code incorrect. Vérifiez l’heure de votre téléphone et réessayez." }, { status: 400 });
  await clearPreAuth();
  await setAdminCookie();
  await logAction({ agent: "rapport", kind: "sécurité", status: "done", summary: "Double authentification de l’Atelier configurée" }).catch(() => {});
  return NextResponse.json({ ok: true, recoveryCodes: recovery });
}
