import { NextResponse, after } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { cancelAppointment, cancelToken } from "@/lib/appointments";
import { rateLimit } from "@/lib/security/rate-limit";
import { logAction } from "@/lib/agents/log";
import { synchroniserGoogle } from "@/lib/google-agenda";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Annulation par la cliente, avec le lien signé de son e-mail. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "rendez-vous-annulation", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = z.object({ id: z.string().regex(/^RDV-[A-F0-9]{8}$/), jeton: z.string().max(64) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !same(parsed.data.jeton, cancelToken(parsed.data.id))) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const a = await cancelAppointment(parsed.data.id);
  if (!a) return NextResponse.json({ error: "Ce rendez-vous est déjà annulé." }, { status: 404 });
  await logAction({ agent: "rendez-vous", kind: "annulation", status: "info", summary: `Rendez-vous de ${a.name} annulé par la cliente` }).catch(() => {});
  // l'événement de Google Agenda est supprimé, s'il existe
  after(() => synchroniserGoogle(a.id).then(() => undefined));
  return NextResponse.json({ ok: true });
}
