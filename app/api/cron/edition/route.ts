/** Publications programmées de l'éditeur : chaque heure (GitHub Actions) et chaque matin (Vercel Cron). */
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/security/cron";
import { runScheduled } from "@/lib/edition/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const done = await runScheduled();
  return NextResponse.json({ ok: true, publies: done.map((d) => `${d.doc} (${d.locale})`) });
}
