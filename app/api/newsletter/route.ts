import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { subscribeNewsletter } from "@/lib/shopify/admin";
import { after } from "next/server";
import { upsertContact } from "@/lib/marketing/provider";
import { onNewsletterSignup } from "@/lib/marketing/flows";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const Body = z.object({ email: z.email(), consent: z.literal(true), source: z.string().max(40).optional(), turnstile: z.string().max(2048).optional() });

export async function POST(req: Request) {
  const limited = await rateLimit(req, "newsletter", { limit: 8, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide et d’accepter de recevoir nos lettres." }, { status: 400 });
  }
  const { email, source, turnstile } = parsed.data;
  if (!(await verifyTurnstile(turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  const list = (await kv.get<{ email: string; date: string; source?: string }[]>("newsletter:subscribers")) ?? [];
  if (!list.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    list.push({ email, date: new Date().toISOString(), source });
    await kv.set("newsletter:subscribers", list);
  }
  await subscribeNewsletter(email).catch((e) => console.error("[newsletter] Shopify", e));
  after(async () => {
    await upsertContact({ email, marketing: true }).catch((e) => console.error("[newsletter] e-mails", e));
    await onNewsletterSignup(email).catch((e) => console.error("[newsletter] bienvenue", e));
  });
  return NextResponse.json({ ok: true, message: "Merci. Votre première lettre arrivera avec la prochaine saison." });
}
