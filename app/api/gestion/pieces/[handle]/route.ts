/**
 * Atelier › Produits › une pièce : nom, accroche, description et référencement.
 * Réservé aux comptes de l'Atelier (session revérifiée ici) ; origine contrôlée par proxy.ts ;
 * entrées validées (Zod) ; chaque changement est noté au journal.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { CatalogueError, modifierTextes } from "@/lib/commerce/atelier-catalogue";
import { paragraphes } from "@/lib/commerce/statut-pieces";

export const dynamic = "force-dynamic";

const Handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const Body = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().max(6000).optional(),
    seoTitle: z.string().trim().min(2).max(120).optional(),
    seoDescription: z.string().trim().max(320).optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const handle = Handle.safeParse((await params).handle);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!handle.success || !parsed.success) return NextResponse.json({ error: "Ces textes n’ont pas pu être lus. Vérifiez le nom (2 caractères au moins) et la longueur des textes." }, { status: 400 });
  const b = parsed.data;
  try {
    const r = await modifierTextes(handle.data, {
      title: b.title,
      tagline: b.tagline,
      description: b.description !== undefined ? paragraphes(b.description) : undefined,
      seo: b.seoTitle !== undefined && b.seoDescription !== undefined ? { title: b.seoTitle, description: b.seoDescription } : undefined,
    });
    await logAction({ agent: "systeme", kind: "update_piece", status: "done", summary: `Par l’atelier · ${r.summary}`, target: { type: "product", id: handle.data, label: r.title, href: `atelier:/catalogue/${handle.data}` } });
    return NextResponse.json({ ok: true, summary: r.summary });
  } catch (e) {
    if (e instanceof CatalogueError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/pieces]", e);
    return NextResponse.json({ error: "Les textes n’ont pas pu être enregistrés. Merci de réessayer." }, { status: 502 });
  }
}
