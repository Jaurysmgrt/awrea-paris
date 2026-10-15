/** Atelier : déposer l'étiquette prépayée d'un retour (PDF, 2 Mo au plus) ; elle part à la cliente. */
import { NextResponse } from "next/server";
import { uploadReturnLabel } from "@/lib/returns-flow";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("etiquette");
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Joignez l’étiquette en PDF (2 Mo au plus)." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") return NextResponse.json({ error: "Le fichier n’est pas un PDF." }, { status: 400 });
  try {
    await uploadReturnLabel((await params).id, bytes);
    return NextResponse.json({ ok: true, message: "Étiquette envoyée à la cliente." });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Dépôt impossible." }, { status: 409 });
  }
}
