/**
 * Atelier › Commandes : une note interne sur une commande (jamais vue par la cliente). Réservé aux
 * comptes de l'Atelier ; origine contrôlée par proxy.ts (CSRF) ; entrées validées.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { getOrder } from "@/lib/commerce/orders";
import { ajouterNote, NOTE_MAX, SuiviError } from "@/lib/admin/commandes-suivi";

export const dynamic = "force-dynamic";

const Body = z.object({ texte: z.string().max(NOTE_MAX * 2) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const order = await getOrder(decodeURIComponent((await params).number).slice(0, 40));
  if (!order) return NextResponse.json({ error: "Cette commande n’existe pas." }, { status: 404 });
  try {
    const note = await ajouterNote(order, parsed.data.texte, par);
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    if (e instanceof SuiviError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/commandes/notes]", e);
    return NextResponse.json({ error: "La note n’a pas pu être enregistrée. Merci de réessayer." }, { status: 502 });
  }
}
