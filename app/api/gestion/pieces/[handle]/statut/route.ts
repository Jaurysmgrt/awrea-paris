/** Atelier › Produits : mettre une pièce en ligne, en brouillon, ou l'archiver. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { CatalogueError, changerStatut } from "@/lib/commerce/atelier-catalogue";
import { STATUTS } from "@/lib/commerce/statut-pieces";

export const dynamic = "force-dynamic";

const Handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const Body = z.object({ statut: z.enum(STATUTS as [string, ...string[]]) }).strict();

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const handle = Handle.safeParse((await params).handle);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!handle.success || !parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  try {
    const r = await changerStatut(handle.data, parsed.data.statut as (typeof STATUTS)[number]);
    await logAction({ agent: "systeme", kind: "statut_piece", status: "done", summary: `Par l’atelier · ${r.summary}`, target: { type: "product", id: handle.data, label: r.title, href: `atelier:/catalogue/${handle.data}` } });
    return NextResponse.json({ ok: true, message: r.summary });
  } catch (e) {
    if (e instanceof CatalogueError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/pieces/statut]", e);
    return NextResponse.json({ error: "Le statut n’a pas pu être changé. Merci de réessayer." }, { status: 502 });
  }
}
