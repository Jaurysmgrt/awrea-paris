/**
 * Atelier › Clientes : une note interne sur une cliente (jamais vue par elle). Réservé aux comptes
 * de l'Atelier ; origine contrôlée par proxy.ts (CSRF) ; entrées validées.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { ajouterNoteCliente, ClienteError, NOTE_CLIENTE_MAX, trouverCliente } from "@/lib/admin/clientes-suivi";

export const dynamic = "force-dynamic";

const Body = z.object({ texte: z.string().max(NOTE_CLIENTE_MAX * 2) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const cliente = await trouverCliente((await params).id);
  if (!cliente) return NextResponse.json({ error: "Cette cliente n’existe pas." }, { status: 404 });
  try {
    return NextResponse.json({ ok: true, note: await ajouterNoteCliente(cliente.id, parsed.data.texte, par) });
  } catch (e) {
    if (e instanceof ClienteError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/clientes/notes]", e);
    return NextResponse.json({ error: "La note n’a pas pu être enregistrée. Merci de réessayer." }, { status: 502 });
  }
}
