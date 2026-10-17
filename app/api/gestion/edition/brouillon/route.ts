import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { discardDraft, draftValue, saveDraftValue } from "@/lib/edition/store";
import { isSafePath, parsePath } from "@/lib/edition/paths";
import { guardValue, writingFor } from "@/lib/edition/guard";
import { stegaClean } from "@/lib/edition/stega";
import { blockDef, type Img } from "@/lib/edition/blocks";
import { getAt } from "@/lib/edition/paths";
import { readDoc } from "@/lib/edition/store";

const Image = z.object({
  src: z.string().max(400).regex(/^(\/media\/|\/api\/media\/|https:\/\/cdn\.shopify\.com\/|$)/),
  alt: z.string().max(180),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
});

const Body = z.union([
  z.object({ doc: z.string(), locale: z.string(), path: z.string().max(300), value: z.string().max(20000) }),
  z.object({ doc: z.string(), locale: z.string(), path: z.string().max(300), image: Image }),
  z.object({ doc: z.string(), locale: z.string(), path: z.string().max(300), choice: z.string().max(40) }),
  z.object({ doc: z.string(), locale: z.string(), path: z.string().max(300), list: z.array(z.string().max(120)).max(12) }),
  z.object({ doc: z.string(), locale: z.string(), path: z.string().max(300), link: z.object({ label: z.string().max(60), href: z.string().max(300).regex(/^(\/(?!\/)|https:\/\/|mailto:)/) }).nullable() }),
  z.object({ doc: z.string(), locale: z.string(), abandon: z.literal(true) }),
]);

/**
 * Modifie une valeur du brouillon. Les garde-fous qui protègent la mise en page bloquent ; le
 * contrôle d'écriture ne fait que signaler, avec ses suggestions.
 */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Modification illisible.");
  const body = parsed.data;
  const target = docAndLocale(body.doc, body.locale);
  if (!target) return bad("Document inconnu.");
  if ("abandon" in body) {
    await discardDraft(target.doc, target.locale);
    return NextResponse.json({ ok: true });
  }
  const at = parsePath(body.path);
  if (!at.length || !isSafePath(at)) return bad("Champ inconnu.");
  const previous = await draftValue(target.doc, target.locale, at);

  if ("value" in body) {
    const value = stegaClean(body.value).replace(/\r\n/g, "\n");
    if (previous !== undefined && typeof previous !== "string") return bad("Ce champ n’est pas un texte.");
    const blocked = guardValue(body.path, typeof previous === "string" ? previous : undefined, value);
    if (blocked) return bad(blocked);
    await saveDraftValue(target.doc, target.locale, at, value, who.email);
    return NextResponse.json({ ok: true, issues: writingFor(body.path, value, target.locale) });
  }
  if ("image" in body) {
    const img: Img = { ...body.image, alt: stegaClean(body.image.alt) };
    const blocked = guardValue(`${body.path}.alt`, undefined, img.alt);
    if (blocked && img.src) return bad(blocked);
    await saveDraftValue(target.doc, target.locale, at, img, who.email);
    return NextResponse.json({ ok: true, issues: img.alt ? writingFor(`${body.path}.alt`, img.alt, target.locale) : [] });
  }
  if ("choice" in body) {
    // seulement une des variantes prévues par le bloc (garde-fou de la direction artistique)
    const block = getAt(await readDoc(target.doc, target.locale, { draft: true }), at.slice(0, -1)) as { type?: string } | undefined;
    const field = block?.type ? blockDef(block.type)?.fields.find((f) => f.key === at[at.length - 1]) : undefined;
    if (!field?.options?.some((o) => o.value === body.choice)) return bad("Ce réglage n’existe pas ici.");
    await saveDraftValue(target.doc, target.locale, at, body.choice, who.email);
    return NextResponse.json({ ok: true, issues: [] });
  }
  if ("list" in body) {
    if (!body.list.every((h) => /^[a-z0-9][a-z0-9-]*$/.test(h))) return bad("Pièces inconnues.");
    await saveDraftValue(target.doc, target.locale, at, body.list, who.email);
    return NextResponse.json({ ok: true, issues: [] });
  }
  if (body.link) {
    const label = stegaClean(body.link.label);
    const blocked = guardValue(`${body.path}.label`, undefined, label);
    if (blocked) return bad(blocked);
    await saveDraftValue(target.doc, target.locale, at, { label, href: body.link.href }, who.email);
    return NextResponse.json({ ok: true, issues: writingFor(`${body.path}.label`, label, target.locale) });
  }
  await saveDraftValue(target.doc, target.locale, at, null, who.email);
  return NextResponse.json({ ok: true, issues: [] });
}
