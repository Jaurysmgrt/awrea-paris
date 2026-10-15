import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { draftOf, historyOf, publishedDoc, saveDraftContent } from "@/lib/edition/store";
import { guardValue, writingFor } from "@/lib/edition/guard";
import { documentInfo } from "@/lib/edition/documents";
import { EmailDocSchema } from "@/lib/email/schema";
import { emailTexts, type EmailDoc } from "@/lib/email/blocks";

/** Un e-mail : brouillon (s'il existe) et version publiée. */
export async function GET(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const p = new URL(req.url).searchParams;
  const target = docAndLocale(p.get("id"), p.get("locale") ?? "fr");
  if (!target || (await documentInfo(target.doc))?.kind !== "email") return bad("E-mail inconnu.");
  const [draft, published, history] = await Promise.all([draftOf(target.doc, target.locale), publishedDoc(target.doc, target.locale), historyOf(target.doc, target.locale)]);
  return NextResponse.json({ doc: draft?.content ?? published, draftAt: draft?.updatedAt ?? null, publishedAt: history[0]?.at || null, published });
}

/**
 * Enregistre le brouillon complet d'un e-mail. Bloquant : la forme, les longueurs, les repères
 * {prenom}… à garder. Non bloquant : le contrôle d'écriture, renvoyé pour affichage.
 */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const body = z.object({ id: z.string(), locale: z.string(), doc: z.unknown() }).safeParse(await req.json().catch(() => null));
  const target = body.success ? docAndLocale(body.data.id, body.data.locale) : null;
  if (!body.success || !target || (await documentInfo(target.doc))?.kind !== "email") return bad("E-mail inconnu.");
  const parsed = EmailDocSchema.safeParse(body.data.doc);
  if (!parsed.success) return bad("Cet e-mail contient un élément que l’éditeur ne sait pas enregistrer.");
  const doc = parsed.data as EmailDoc;
  const before = ((await draftOf(target.doc, target.locale))?.content ?? (await publishedDoc(target.doc, target.locale))) as EmailDoc | null;
  const known = Object.keys(before?.variables ?? doc.variables);
  for (const t of emailTexts(doc)) {
    // un repère inconnu ne peut pas être rempli à l'envoi ; un repère connu peut être déplacé d'un bloc à l'autre
    const unknown = (t.text.match(/\{([a-zA-Z]\w*)\}/g) ?? []).map((m) => m.slice(1, -1)).filter((v) => !known.includes(v));
    if (unknown.length) return bad(`{${unknown[0]}} n’est pas reconnu dans cet e-mail. Les repères possibles : ${known.map((k) => `{${k}}`).join(", ") || "aucun"}.`);
    const blocked = guardValue(t.path, undefined, t.text);
    if (blocked && !/^\[[^\]]+\]$/.test(t.text.trim())) return bad(blocked);
  }
  await saveDraftContent(target.doc, target.locale, doc, who.email);
  const issues = emailTexts(doc).flatMap((t) => writingFor(t.path, t.text, target.locale === "en" ? "en" : "fr").filter((i) => i.severity === "erreur").map((i) => ({ path: t.path, ...i })));
  return NextResponse.json({ ok: true, issues });
}
