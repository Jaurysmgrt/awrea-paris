import { NextResponse } from "next/server";
import { z } from "zod";
import { adminPassword, checkPassword, setAdminCookie } from "@/lib/auth/admin";
import { clientIp, loginGuard } from "@/lib/security/rate-limit";

const GUARD = { limit: 8, windowSeconds: 15 * 60 };

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await loginGuard.blocked("admin", ip, GUARD)) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  if (!adminPassword()) return NextResponse.json({ error: "Le mot de passe du tableau de bord n’est pas configuré (ATELIER_PASSWORD)." }, { status: 503 });
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    await loginGuard.fail("admin", ip, GUARD); // seuls les échecs comptent
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await loginGuard.reset("admin", ip, GUARD);
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
