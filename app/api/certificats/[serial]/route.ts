import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/require-customer";
import { claimCertificate } from "@/lib/certificates";
import { loginGuard, clientIp } from "@/lib/security/rate-limit";

/** 10 essais de code par quart d'heure et par adresse : les codes ne se devinent pas. */
const GUARD = { limit: 10, windowSeconds: 15 * 60 };

/** Rattache un certificat au compte de la cliente connectée (code imprimé sur le certificat papier). */
export async function POST(req: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const ip = clientIp(req);
  if (await loginGuard.blocked("certificat", ip, GUARD)) return NextResponse.json({ error: "Trop d’essais. Réessayez dans quelques minutes." }, { status: 429 });
  const parsed = z.object({ code: z.string().trim().min(8).max(12) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le code comporte huit caractères, par exemple ABCD-EFGH." }, { status: 400 });
  const { serial } = await params;
  const r = await claimCertificate(serial, parsed.data.code, session);
  if (r === "ok") {
    await loginGuard.reset("certificat", ip, GUARD);
    return NextResponse.json({ ok: true });
  }
  await loginGuard.fail("certificat", ip, GUARD);
  return NextResponse.json({ error: r === "inconnu" ? "Certificat inconnu." : "Ce code ne correspond pas à ce certificat." }, { status: r === "inconnu" ? 404 : 400 });
}
