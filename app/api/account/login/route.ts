import { NextResponse } from "next/server";
import { z } from "zod";
import { startEmailLogin } from "@/lib/auth/customer";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { legalVersions } from "@/content/legal-versions";

const Body = z.object({
  email: z.email().max(200),
  mode: z.enum(["login", "signup"]),
  terms: z.boolean().optional(),
  marketing: z.boolean().optional(),
  turnstile: z.string().max(2048).optional(),
});

/** Étape 1 de la connexion : envoi d'un code à usage unique par e-mail. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "login-code", { limit: 6, windowSeconds: 15 * 60 }, "Trop de demandes de code. Merci de réessayer dans quelques minutes.");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide." }, { status: 400 });
  const { email, mode, terms, marketing, turnstile } = parsed.data;
  if (!(await verifyTurnstile(turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  if (mode === "signup" && !terms) {
    return NextResponse.json({ error: "Pour créer votre compte, merci d’accepter les conditions générales d’utilisation." }, { status: 400 });
  }
  const r = await startEmailLogin(email, { create: mode === "signup", termsVersion: mode === "signup" ? legalVersions.cgu : undefined, marketingEmail: mode === "signup" ? marketing : undefined });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, demoCode: r.demoCode });
}
