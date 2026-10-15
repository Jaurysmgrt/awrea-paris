import { NextResponse } from "next/server";
import { z } from "zod";
import { checkDropPassword, getDrop, grantDropAccess, readDropAccess } from "@/lib/drops";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";

/** 8 essais de mot de passe par quart d'heure et par adresse. */
const GUARD = { limit: 8, windowSeconds: 15 * 60 };

/** L'accès de la visiteuse à ce drop (lu dans son cookie signé). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await readDropAccess();
  return NextResponse.json({ access: access[slug] ?? null }, { headers: { "Cache-Control": "no-store" } });
}

/** Vente privée : le mot de passe transmis par la maison ouvre l'accès. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("drop", ip, GUARD)) return NextResponse.json({ error: "Trop d’essais. Réessayez dans quelques minutes." }, { status: 429 });
  const parsed = z.object({ password: z.string().min(1).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer le mot de passe." }, { status: 400 });
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop || !checkDropPassword(drop, parsed.data.password)) {
    await loginGuard.fail("drop", ip, GUARD);
    return NextResponse.json({ error: "Ce mot de passe n’ouvre pas cette vente privée." }, { status: 403 });
  }
  await loginGuard.reset("drop", ip, GUARD);
  await grantDropAccess(slug, "prive");
  return NextResponse.json({ ok: true });
}
