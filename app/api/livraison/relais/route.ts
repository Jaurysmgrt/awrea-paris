/** Points relais proches d'un code postal (démonstration : lib/commerce/relays.ts). */
import { NextResponse } from "next/server";
import { relayPoints } from "@/lib/commerce/relays";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: Request) {
  const limited = await rateLimit(req, "relais", { limit: 60, windowSeconds: 600 });
  if (limited) return limited;
  const p = new URL(req.url).searchParams;
  const country = (p.get("country") ?? "FR").slice(0, 2).toUpperCase();
  return NextResponse.json({ points: relayPoints((p.get("zip") ?? "").slice(0, 12), country) });
}
