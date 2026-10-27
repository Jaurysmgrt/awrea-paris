import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { LOCALES } from "@/lib/edition/config";
import { draftOf, historyOf, isDocId, publishedDoc, runScheduled, scheduled } from "@/lib/edition/store";
import { documentInfo } from "@/lib/edition/documents";

/** Brouillon et version publiée de chaque document de la page, en français et en anglais. */
export async function GET(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const ids = z.array(z.string().refine(isDocId)).max(20).safeParse((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean));
  if (!ids.success) return bad("Documents inconnus.");
  // les publications programmées arrivées à échéance partent dès que l'éditeur s'ouvre
  await runScheduled().catch((e) => console.error("[édition] publications programmées", e));
  const programme = await scheduled();
  const docs = Object.fromEntries(
    await Promise.all(
      ids.data.map(async (id) => {
        const info = await documentInfo(id);
        const locales = Object.fromEntries(
          await Promise.all(
            LOCALES.map(async (l) => {
              const [draft, published, history] = await Promise.all([draftOf(id, l), publishedDoc(id, l), historyOf(id, l)]);
              return [l, { draft: draft?.content ?? null, draftUpdatedAt: draft?.updatedAt ?? null, draftBy: draft?.by ?? null, published, publishedAt: history[0]?.at || null, versions: history.length }];
            }),
          ),
        );
        return [id, { info, locales, programme: programme.filter((p) => p.doc === id).map(({ content: _c, base: _b, ...p }) => p) }];
      }),
    ),
  );
  return NextResponse.json({ docs });
}
