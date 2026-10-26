import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { LOCALES, type Locale } from "@/lib/edition/config";
import { draftOf, isDocId, publishDraft, scheduleDraft } from "@/lib/edition/store";
import { todos } from "@/lib/edition/blocks";
import { logAction } from "@/lib/agents/log";

const Body = z.object({ docs: z.array(z.string().refine(isDocId)).min(1).max(20), at: z.string().datetime().optional() });

/** Publie maintenant, ou programme, les brouillons des documents de la page (toutes langues). */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Demande illisible.");
  const { docs, at } = parsed.data;
  const drafts: { doc: string; locale: Locale }[] = [];
  for (const doc of docs) for (const locale of LOCALES) if (await draftOf(doc, locale)) drafts.push({ doc, locale });
  if (!drafts.length) return bad("Aucune modification à publier.");
  // un texte encore entre crochets (« [Écrire le titre] ») ne part jamais en ligne
  for (const d of drafts) {
    const left = todos((await draftOf(d.doc, d.locale))?.content);
    if (left.length) return bad(`Il reste ${left.length} texte(s) à écrire avant de publier. Ils sont entre crochets sur la page.`);
  }
  if (at) {
    const when = new Date(at);
    if (when.getTime() < Date.now() + 60_000) return bad("Choisissez un moment à venir.");
    for (const d of drafts) await scheduleDraft(d.doc, d.locale, when, who.email);
    await logAction({ agent: "systeme", kind: "edition", status: "info", summary: `Publication programmée par ${who.email} : ${[...new Set(drafts.map((d) => d.doc))].join(", ")}` }).catch(() => {});
    return NextResponse.json({ ok: true, programme: at });
  }
  for (const d of drafts) await publishDraft(d.doc, d.locale, who.email);
  await logAction({ agent: "systeme", kind: "edition", status: "done", summary: `Publié par ${who.email} : ${[...new Set(drafts.map((d) => d.doc))].join(", ")}` }).catch(() => {});
  return NextResponse.json({ ok: true, publies: drafts.length });
}
