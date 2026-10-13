import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { updateCertificate } from "@/lib/certificates";

const Body = z.object({
  madeOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(240).nullable().optional(),
});

/** Atelier : corriger la date de fabrication ou écrire le mot de la créatrice d'un certificat. */
export async function PATCH(req: Request, { params }: { params: Promise<{ serial: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const { serial } = await params;
  const c = await updateCertificate(serial, { madeOn: parsed.data.madeOn, note: parsed.data.note ?? null });
  if (!c) return NextResponse.json({ error: "Certificat inconnu." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
