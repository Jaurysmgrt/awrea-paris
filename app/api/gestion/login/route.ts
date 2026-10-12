import { NextResponse } from "next/server";
import { z } from "zod";
import { adminPassword, checkPassword, setAdminCookie } from "@/lib/auth/admin";

const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 8) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  if (!adminPassword()) return NextResponse.json({ error: "Le mot de passe du tableau de bord n’est pas configuré (ATELIER_PASSWORD)." }, { status: 503 });
  const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    attempts.set(ip, [...recent, now]); // seuls les échecs comptent
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  attempts.delete(ip);
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
