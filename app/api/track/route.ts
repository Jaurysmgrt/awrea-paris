import { NextResponse } from "next/server";
import { z } from "zod";
import { recordView } from "@/lib/agents/analytics";

/** Vue de fiche produit, agrégée par semaine, sans cookie ni donnée personnelle (envoyée seulement avec consentement). */
export async function POST(req: Request) {
  const parsed = z.object({ handle: z.string().min(1).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordView(parsed.data.handle);
  return NextResponse.json({ ok: true });
}
