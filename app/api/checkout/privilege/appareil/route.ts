/**
 * « Recevoir mon privilège sur cet appareil » (récapitulatif de paiement) : la cliente a confirmé son
 * inscription sur un autre appareil. Si un privilège valable attend l'adresse, un e-mail part avec un
 * lien qui le rattache au navigateur où il est ouvert (lib/crm/lettre.ts, envoyerLienAppareil).
 * La réponse est toujours la même, et l'envoi se fait après elle : ni le texte ni le temps de réponse
 * ne disent si l'adresse a un privilège. Contrôle d'origine (proxy.ts), limitation de débit par
 * adresse IP (et trois envois par heure au plus pour une adresse), validation Zod.
 */
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { envoyerLienAppareil } from "@/lib/crm/lettre";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.email().max(254), langue: z.enum(["fr", "en"]).optional() }).strict();

export async function POST(req: Request) {
  const limited = await rateLimit(req, "privilege-appareil", { limit: 5, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalide" }, { status: 400 });
  const { email, langue } = parsed.data;
  after(() => envoyerLienAppareil(email, langue ?? "fr").catch((e) => console.error("[privilège] lien pour un autre appareil", e)));
  return NextResponse.json({ ok: true });
}
