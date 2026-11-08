/**
 * Atelier › Clientes : effacer le compte d'une cliente à sa demande (RGPD). La créatrice recopie
 * l'adresse e-mail de la cliente pour confirmer ; les commandes restent, détachées du compte
 * (lib/admin/clientes-suivi.ts). Réservé aux comptes de l'Atelier ; origine contrôlée par proxy.ts.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { ClienteError, effacerCliente } from "@/lib/admin/clientes-suivi";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().max(320) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  try {
    await effacerCliente((await params).id, parsed.data.email, par);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ClienteError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/clientes/effacer]", e);
    return NextResponse.json({ error: "L’effacement n’a pas abouti. Merci de réessayer." }, { status: 502 });
  }
}
