/** Atelier › Produits : copie d'une pièce, en brouillon, pour en créer une variante. */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { CatalogueError, dupliquerPiece } from "@/lib/commerce/atelier-catalogue";

export const dynamic = "force-dynamic";

const Handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);

export async function POST(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const handle = Handle.safeParse((await params).handle);
  if (!handle.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  try {
    const r = await dupliquerPiece(handle.data);
    await logAction({ agent: "systeme", kind: "copie_piece", status: "done", summary: `Par l’atelier · copie de la pièce en brouillon : ${r.title}`, target: { type: "product", id: r.handle, label: r.title, href: `atelier:/catalogue/${r.handle}` } });
    return NextResponse.json({ ok: true, handle: r.handle, title: r.title });
  } catch (e) {
    if (e instanceof CatalogueError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/pieces/dupliquer]", e);
    return NextResponse.json({ error: "La copie n’a pas pu être faite. Merci de réessayer." }, { status: 502 });
  }
}
