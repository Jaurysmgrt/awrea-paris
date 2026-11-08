/**
 * Atelier › Commandes : annuler et rembourser une commande, ou la rembourser. Geste d'argent :
 * demandé par la créatrice après confirmation dans l'Atelier, pour la commande qu'elle a sous les
 * yeux (identifiant et montant comparés), un seul à la fois et jamais deux fois
 * (lib/admin/commandes-suivi.ts, lib/commerce/argent.ts). Réservé aux comptes de l'Atelier ;
 * origine contrôlée par proxy.ts.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { faireGeste, SuiviError } from "@/lib/admin/commandes-suivi";

export const dynamic = "force-dynamic";

const Body = z
  .object({
    geste: z.enum(["annuler-rembourser", "rembourser"]),
    id: z.string().min(1).max(120),
    total: z.number().int().nonnegative(),
  })
  .strict();

export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  let numero: string;
  try {
    numero = decodeURIComponent((await params).number).slice(0, 40);
  } catch {
    return NextResponse.json({ error: "Cette commande n’existe pas." }, { status: 404 });
  }
  try {
    return NextResponse.json({ ok: true, message: await faireGeste(numero, parsed.data, par) });
  } catch (e) {
    if (e instanceof SuiviError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("[gestion/commandes/geste]", e);
    return NextResponse.json({ error: "Le geste n’a pas pu être confirmé. Vérifiez la commande avant de réessayer : une commande remboursée ne l’est jamais deux fois." }, { status: 502 });
  }
}
