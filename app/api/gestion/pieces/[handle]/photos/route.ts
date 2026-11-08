/**
 * Atelier › Produits : les photos d'une pièce. En ajouter (déposées d'abord par /api/media), en
 * retirer, choisir la principale, écrire le texte alternatif. Réservé aux comptes de l'Atelier ;
 * origine contrôlée par proxy.ts (CSRF) ; entrées validées.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { CatalogueError, changerPhotos, PHOTOS_MAX } from "@/lib/commerce/atelier-catalogue";

export const dynamic = "force-dynamic";

const Handle = z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
// clé d'une photo : l'identifiant du média Shopify, ou l'adresse de la photo en démonstration
const Cle = z.string().min(1).max(300).regex(/^[\w:/.\-?=&%]+$/);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ajouter"), mediaIds: z.array(z.string().regex(/^[a-z0-9]{6,40}$/)).min(1).max(PHOTOS_MAX) }).strict(),
  z.object({ action: z.literal("retirer"), cle: Cle }).strict(),
  z.object({ action: z.literal("principale"), cle: Cle }).strict(),
  z.object({ action: z.literal("texte"), cle: Cle, alt: z.string().trim().min(3).max(240) }).strict(),
]);

export async function POST(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const handle = Handle.safeParse((await params).handle);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!handle.success || !parsed.success) {
    const texte = parsed.success === false && parsed.error.issues.some((i) => i.path.includes("alt"));
    return NextResponse.json({ error: texte ? "Le texte de la photo compte entre 3 et 240 caractères." : "Demande illisible." }, { status: 400 });
  }
  try {
    const r = await changerPhotos(handle.data, parsed.data);
    await logAction({ agent: "systeme", kind: "photos_piece", status: "done", summary: `Par l’atelier · ${r.summary}`, target: { type: "product", id: handle.data, label: r.title, href: `atelier:/catalogue/${handle.data}` } });
    return NextResponse.json({ ok: true, message: r.summary });
  } catch (e) {
    if (e instanceof CatalogueError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/pieces/photos]", e);
    return NextResponse.json({ error: "Les photos n’ont pas pu être modifiées. Merci de réessayer." }, { status: 502 });
  }
}
