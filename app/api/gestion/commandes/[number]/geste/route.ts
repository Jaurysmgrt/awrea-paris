/**
 * Atelier › Commandes : annuler et rembourser une commande, ou la rembourser. Geste d'argent :
 * demandé par la créatrice après confirmation dans l'Atelier, un seul à la fois par commande
 * (lib/admin/commandes-suivi.ts). Réservé aux comptes de l'Atelier ; origine contrôlée par proxy.ts.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { getOrder } from "@/lib/commerce/orders";
import { faireGeste, SuiviError } from "@/lib/admin/commandes-suivi";

export const dynamic = "force-dynamic";

const Body = z.object({ geste: z.enum(["annuler-rembourser", "rembourser"]) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  const order = await getOrder(decodeURIComponent((await params).number).slice(0, 40));
  if (!order) return NextResponse.json({ error: "Cette commande n’existe pas." }, { status: 404 });
  try {
    return NextResponse.json({ ok: true, message: await faireGeste(order, parsed.data.geste, par) });
  } catch (e) {
    if (e instanceof SuiviError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("[gestion/commandes/geste]", e);
    return NextResponse.json({ error: "Le geste n’a pas abouti. Rien n’a été remboursé : merci de vérifier la commande avant de réessayer." }, { status: 502 });
  }
}
