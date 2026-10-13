import { NextResponse, after } from "next/server";
import { z } from "zod";
import { verifyEmailLogin } from "@/lib/auth/customer";
import { ensureProfile } from "@/lib/customers";
import { syncCustomerToShopify } from "@/lib/customers/shopify-sync";
import { onCustomerCreated } from "@/lib/marketing/flows";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";

const Body = z.object({ email: z.email().max(200), code: z.string().regex(/^\d{6,8}$/) });
const GUARD = { limit: 10, windowSeconds: 15 * 60 };

/** Étape 2 : vérification du code ; ouvre la session et prépare le profil. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("login", ip, GUARD)) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le code se compose de six chiffres." }, { status: 400 });
  const r = await verifyEmailLogin(parsed.data.email, parsed.data.code);
  if (!r.ok) {
    await loginGuard.fail("login", ip, GUARD);
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  await loginGuard.reset("login", ip, GUARD);
  const profile = await ensureProfile(r.session, { termsVersion: r.termsVersion, marketingEmail: r.marketingEmail });
  after(async () => {
    await syncCustomerToShopify(profile).catch((e) => console.error("[compte] Shopify", e));
    if (r.created) await onCustomerCreated(profile).catch((e) => console.error("[compte] bienvenue", e));
  });
  return NextResponse.json({ ok: true });
}
