/**
 * Réglages d'une pièce par la créatrice (tableau de bord Atelier, page Catalogue) : prix, délai de
 * fabrication, indicateurs « prix provisoire », « délai provisoire » et « nouveau ». Remplace
 * l'ancienne mise à jour des stocks : chaque pièce est créée sur demande, sans stock.
 * Réservé aux comptes de l'Atelier ; origine contrôlée par proxy.ts (CSRF) ; entrées validées.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";
import { PieceError, updatePiece } from "@/lib/commerce/pieces";

export const dynamic = "force-dynamic";

const Weeks = z.number().int().min(LEAD_TIME_BOUNDS.min).max(LEAD_TIME_BOUNDS.max);

const Body = z
  .object({
    handle: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
    priceEuros: z.number().positive().max(100000).optional(),
    priceProvisional: z.boolean().optional(),
    leadTime: z.object({ min: Weeks, max: Weeks }).refine((t) => t.min <= t.max, "le délai minimal dépasse le délai maximal").optional(),
    leadTimeProvisional: z.boolean().optional(),
    isNew: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ces réglages n’ont pas pu être lus. Vérifiez le prix et le délai." }, { status: 400 });
  const { handle, priceEuros, ...rest } = parsed.data;
  try {
    const r = await updatePiece(handle, { ...rest, ...(priceEuros !== undefined ? { price: Math.round(priceEuros * 100) } : {}) });
    await logAction({ agent: "systeme", kind: "update_piece", status: "done", summary: `Par l’atelier · ${r.summary}`, target: { type: "product", id: handle, label: r.title, href: `/boutique/${handle}` } });
    return NextResponse.json({ ok: true, summary: r.summary });
  } catch (e) {
    if (e instanceof PieceError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/catalogue/piece]", e);
    return NextResponse.json({ error: "La pièce n’a pas pu être mise à jour. Merci de réessayer." }, { status: 502 });
  }
}
