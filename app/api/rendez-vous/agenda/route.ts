import { timingSafeEqual } from "node:crypto";
import { identity } from "@/content/brand/identity";
import { agendaToken, listAppointments, toIcs } from "@/lib/appointments";

/**
 * Abonnement de l'agenda de la créatrice (Google, Apple, Outlook) : adresse secrète, donnée dans
 * l'Atelier › Rendez-vous. Elle change si SESSION_SECRET change.
 */
export async function GET(req: Request) {
  const jeton = new URL(req.url).searchParams.get("jeton") ?? "";
  const expected = agendaToken();
  if (jeton.length !== expected.length || !timingSafeEqual(Buffer.from(jeton), Buffer.from(expected))) return new Response("Introuvable", { status: 404 });
  const ics = toIcs(await listAppointments(), { location: [identity.address.streetAddress, identity.address.addressLocality].filter(Boolean).join(", "), organizer: process.env.ATELIER_EMAIL ?? identity.email });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}
