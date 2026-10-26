/** Suggestions d'adresses pendant la saisie (lib/address.ts). Lecture seule, débit limité. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestAddresses } from "@/lib/address";
import { rateLimit } from "@/lib/security/rate-limit";

const Query = z.object({ q: z.string().trim().min(3).max(120), country: z.string().length(2).default("FR") });

export async function GET(req: Request) {
  const limited = await rateLimit(req, "adresse", { limit: 120, windowSeconds: 600 });
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  const parsed = Query.safeParse({ q: params.get("q") ?? "", country: params.get("country") ?? undefined });
  if (!parsed.success) return NextResponse.json({ suggestions: [] });
  return NextResponse.json({ suggestions: await suggestAddresses(parsed.data.q, parsed.data.country) }, { headers: { "Cache-Control": "private, max-age=300" } });
}
