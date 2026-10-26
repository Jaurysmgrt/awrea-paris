import { NextResponse } from "next/server";
import { z } from "zod";
import { accessSeconds, checkDropPassword, getDrop, grantDropAccess, readDropAccess } from "@/lib/drops";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";

/** 8 essais de mot de passe par quart d'heure et par adresse. */
const GUARD = { limit: 8, windowSeconds: 15 * 60 };
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);

/** L'accès de la visiteuse à cette avant-première (lu dans son cookie signé). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await readDropAccess();
  return NextResponse.json({ access: Object.hasOwn(access, slug) ? access[slug] : null }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Présentation privée : le mot de passe transmis par la Maison ouvre l'accès dans ce navigateur.
 * Réponses : { ok: true }, ou { error: code } (« motDePasse », « refuse », « limite ») ; les
 * messages lisibles vivent dans content/site/fr/avant-premieres.json (erreurs).
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("drop", ip, GUARD)) return NextResponse.json({ error: "limite" }, { status: 429 });
  const parsed = z.object({ password: z.string().min(1).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "motDePasse" }, { status: 400 });
  const { slug } = await params;
  const drop = Slug.safeParse(slug).success ? await getDrop(slug) : null;
  if (!drop || !checkDropPassword(drop, parsed.data.password)) {
    await loginGuard.fail("drop", ip, GUARD);
    return NextResponse.json({ error: "refuse" }, { status: 403 });
  }
  await loginGuard.reset("drop", ip, GUARD);
  await grantDropAccess(slug, "prive", accessSeconds(drop));
  return NextResponse.json({ ok: true });
}
