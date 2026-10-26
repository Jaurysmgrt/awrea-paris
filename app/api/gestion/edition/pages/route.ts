import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { DEFAULT_LOCALE } from "@/lib/edition/config";
import { saveDraftContent } from "@/lib/edition/store";
import { MODELES, registerPage, type Modele } from "@/lib/edition/documents";
import { modelePage } from "@/lib/edition/modeles";
import { atelierApi } from "@/lib/admin/path";

const Body = z.object({ modele: z.enum(Object.keys(MODELES) as [Modele, ...Modele[]]), titre: z.string().trim().min(2).max(90), slug: z.string().max(60).optional() });

/** Nouvelle page à partir d'un modèle : brouillon invisible du public, ouvert aussitôt en mode Édition. */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Donnez un titre de deux à quatre-vingt-dix caractères.");
  try {
    const info = await registerPage(parsed.data.modele, parsed.data.titre, parsed.data.slug ?? "", who.email);
    await saveDraftContent(info.id, DEFAULT_LOCALE, modelePage(parsed.data.modele, parsed.data.titre), who.email);
    return NextResponse.json({ ok: true, id: info.id, chemin: info.chemin, ouvrir: `${atelierApi("/edition/entrer")}?chemin=${encodeURIComponent(info.chemin!)}` });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "La page n’a pas pu être créée.");
  }
}
