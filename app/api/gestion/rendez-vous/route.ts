import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { APPOINTMENT_TYPES, cancelAppointment, setAvailability } from "@/lib/appointments";
import { whenOf } from "@/lib/appointments-notify";
import { sendDocEmail } from "@/lib/email/documents";
import { logAction } from "@/lib/agents/log";

const Hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("disponibilites"),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    start: Hour,
    end: Hour,
    stepMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    minNoticeHours: z.number().int().min(0).max(24 * 14),
    maxDaysAhead: z.number().int().min(1).max(180),
    closed: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(120),
  }),
  z.object({ action: z.literal("annuler"), id: z.string().regex(/^RDV-[A-F0-9]{8}$/) }),
]);

/** Agenda de l'Atelier : disponibilités, annulation d'un rendez-vous (la cliente est prévenue). */
export async function POST(req: Request) {
  const who = await currentAdmin();
  if (!who) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Réglage illisible." }, { status: 400 });
  const d = parsed.data;
  if (d.action === "disponibilites") {
    if (d.start >= d.end) return NextResponse.json({ error: "L’heure de fin vient après l’heure de début." }, { status: 400 });
    const { action: _a, ...availability } = d;
    await setAvailability(availability);
    return NextResponse.json({ ok: true, message: "Disponibilités enregistrées." });
  }
  const a = await cancelAppointment(d.id);
  if (!a) return NextResponse.json({ error: "Ce rendez-vous est déjà annulé." }, { status: 404 });
  await sendDocEmail("email-annulation-rendez-vous", a.email, { vars: { prenom: a.name.split(" ")[0] ?? "", quand: whenOf(a.start), rendezvous: APPOINTMENT_TYPES[a.type].label }, tag: "rendez-vous-annule" }).catch((e) => console.error("[rendez-vous] annulation", e));
  await logAction({ agent: "rendez-vous", kind: "annulation", status: "done", summary: `Rendez-vous de ${a.name} annulé par ${who}, cliente prévenue` }).catch(() => {});
  return NextResponse.json({ ok: true, message: "Rendez-vous annulé, la cliente est prévenue." });
}
