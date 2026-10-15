import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { DEFAULT_LOCALE } from "@/lib/edition/config";
import { draftOf, isDocId, publishedDoc, saveDraftContent } from "@/lib/edition/store";
import { getAt, isSafePath, listOp, parsePath, setAt } from "@/lib/edition/paths";
import { createBlock, duplicateBlock, type Block } from "@/lib/edition/blocks";

const Body = z.object({
  doc: z.string().refine(isDocId),
  path: z.string().max(120),
  op: z.enum(["ajouter", "supprimer", "dupliquer", "monter", "descendre"]),
  index: z.number().int().min(0).max(200),
  type: z.string().max(40).optional(),
});

/**
 * Structure d'une page faite de blocs : ajouter un bloc de la bibliothèque, le dupliquer, le
 * supprimer, le déplacer. La structure se règle dans la version française ; la version anglaise
 * la suit (chaque bloc traduit est retrouvé par son id).
 */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Demande illisible.");
  const { doc, path, op, index, type } = parsed.data;
  const at = parsePath(path);
  if (!at.length || !isSafePath(at)) return bad("Liste inconnue.");
  const current = (await draftOf(doc, DEFAULT_LOCALE))?.content ?? (await publishedDoc(doc, DEFAULT_LOCALE)) ?? {};
  const list = getAt(current, at);
  if (!Array.isArray(list)) return bad("Cette partie de la page n’accepte pas de blocs.");
  const blocks = list as Block[];
  let next: Block[];
  if (op === "ajouter") {
    const block = type ? createBlock(type) : null;
    if (!block) return bad("Ce bloc n’existe pas dans la bibliothèque.");
    next = listOp(blocks, { kind: "insert", index, item: block });
  } else {
    if (index >= blocks.length) return bad("Ce bloc n’existe plus.");
    if (op === "supprimer") next = listOp(blocks, { kind: "remove", index });
    else if (op === "dupliquer") next = listOp(blocks, { kind: "duplicate", index, copy: duplicateBlock });
    else next = listOp(blocks, { kind: "move", from: index, to: op === "monter" ? index - 1 : index + 1 });
  }
  await saveDraftContent(doc, DEFAULT_LOCALE, setAt(current, at, next), who.email);
  return NextResponse.json({ ok: true });
}
