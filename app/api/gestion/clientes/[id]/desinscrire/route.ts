/**
 * Atelier › Clientes : désinscrire une personne de la lettre, à sa demande (un e-mail, un message).
 * La désinscription vaut partout (fiche, compte, outil d'e-mails) et arrête tout envoi marketing.
 * L'inverse n'existe pas : l'Atelier n'abonne jamais personne, seul son consentement le fait.
 * Réservé aux comptes de l'Atelier ; origine contrôlée par proxy.ts (CSRF).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { trouverCliente } from "@/lib/admin/clientes-suivi";
import { unsubscribe } from "@/lib/marketing/unsubscribe";
import { CrmError } from "@/lib/crm";

export const dynamic = "force-dynamic";

const Body = z.object({}).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!Body.safeParse(await req.json().catch(() => ({}))).success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const cliente = await trouverCliente((await params).id);
  if (!cliente) return NextResponse.json({ error: "Cette fiche n’existe pas." }, { status: 404 });
  try {
    await unsubscribe(cliente.email, { source: "atelier", par });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CrmError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/clientes/desinscrire]", e);
    return NextResponse.json({ error: "La désinscription n’a pas abouti. Merci de réessayer." }, { status: 502 });
  }
}
