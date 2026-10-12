import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { subscribeNewsletter } from "@/lib/shopify/admin";

const Body = z.object({ email: z.email(), consent: z.literal(true), source: z.string().max(40).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide et d’accepter de recevoir nos lettres." }, { status: 400 });
  }
  const { email, source } = parsed.data;
  const list = (await kv.get<{ email: string; date: string; source?: string }[]>("newsletter:subscribers")) ?? [];
  if (!list.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    list.push({ email, date: new Date().toISOString(), source });
    await kv.set("newsletter:subscribers", list);
  }
  await subscribeNewsletter(email).catch((e) => console.error("[newsletter] Shopify", e));
  return NextResponse.json({ ok: true, message: "Merci. Votre première lettre arrivera avec la prochaine saison." });
}
