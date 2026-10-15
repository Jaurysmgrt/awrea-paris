/**
 * Suivre une commande sans compte : numéro et e-mail de la commande → lien signé vers son suivi.
 * Débit limité et anti-robots ; la réponse ne dit jamais lequel des deux ne correspond pas.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrderFor, orderLink } from "@/lib/commerce/order-access";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const Body = z.object({ number: z.string().trim().min(3).max(20), email: z.email(), turnstile: z.string().max(2048).optional() });

export async function POST(req: Request) {
  const limited = await rateLimit(req, "suivi", { limit: 8, windowSeconds: 900 }, "Trop d’essais en peu de temps. Merci de réessayer dans un quart d’heure.");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer le numéro de commande et l’adresse e-mail utilisée." }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  const order = await findOrderFor(parsed.data.number, parsed.data.email);
  if (!order) return NextResponse.json({ error: "Aucune commande ne correspond à ce numéro et à cette adresse e-mail." }, { status: 404 });
  return NextResponse.json({ link: orderLink(order) });
}
