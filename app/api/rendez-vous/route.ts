import { NextResponse, after } from "next/server";
import { z } from "zod";
import { APPOINTMENT_TYPES, availableDays, book, slotsFor, type AppointmentType } from "@/lib/appointments";
import { notifyBooked, whenOf } from "@/lib/appointments-notify";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const Type = z.enum(Object.keys(APPOINTMENT_TYPES) as [AppointmentType, ...AppointmentType[]]);

/** Jours libres d'un type de rendez-vous, ou heures libres d'un jour. */
export async function GET(req: Request) {
  const limited = await rateLimit(req, "rendez-vous-lecture", { limit: 120, windowSeconds: 600 });
  if (limited) return limited;
  const p = new URL(req.url).searchParams;
  const type = Type.safeParse(p.get("type"));
  if (!type.success) return NextResponse.json({ error: "Rendez-vous inconnu." }, { status: 400 });
  const day = p.get("jour");
  if (day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Jour illisible." }, { status: 400 });
    return NextResponse.json({ slots: await slotsFor(type.data, day) }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ days: await availableDays(type.data) }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.object({
  type: Type,
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal(true),
  turnstile: z.string().max(2048).optional(),
});

/** Réserve un créneau (sous verrou : deux clientes ne prennent jamais le même moment). */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "rendez-vous", { limit: 6, windowSeconds: 3600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de vérifier le nom, l’e-mail et l’accord." }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  try {
    const a = await book(parsed.data);
    after(() => notifyBooked(a).catch((e) => console.error("[rendez-vous] e-mails", e)));
    return NextResponse.json({ ok: true, id: a.id, quand: whenOf(a.start), rendezvous: APPOINTMENT_TYPES[a.type].label });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ce moment n’est plus libre." }, { status: 409 });
  }
}
