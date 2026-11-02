import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin, isAdmin } from "@/lib/auth/admin";
import { envoyerLettre, essaiLettre } from "@/lib/email/lettre";
import { logAction } from "@/lib/agents/log";

const Body = z.discriminatedUnion("action", [z.object({ action: z.literal("essai") }), z.object({ action: z.literal("envoi"), nombre: z.number().int().min(1).max(100_000) })]);

/**
 * Atelier › E-mails › La lettre : un essai à la créatrice connectée, ou l'envoi à toutes les
 * inscrites (lib/email/lettre.ts : lettre écrite, version jamais envoyée, nombre confirmé).
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  try {
    if (parsed.data.action === "essai") {
      await essaiLettre(me);
      return NextResponse.json({ ok: true, message: `Essai envoyé à ${me}.` });
    }
    const envoi = await envoyerLettre(parsed.data.nombre, me);
    await logAction({ agent: "systeme", kind: "send_newsletter_all", status: "done", summary: `Lettre « ${envoi.sujet} » envoyée à ${envoi.nombre} inscrites` });
    return NextResponse.json({ ok: true, message: `Lettre envoyée à ${envoi.nombre} inscrites.` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "L’envoi n’a pas abouti." }, { status: 409 });
  }
}
