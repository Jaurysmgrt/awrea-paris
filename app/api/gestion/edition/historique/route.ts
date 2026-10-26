import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { historyOf, rollback } from "@/lib/edition/store";
import { logAction } from "@/lib/agents/log";

/** Versions publiées d'un document, la plus récente en tête. */
export async function GET(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const p = new URL(req.url).searchParams;
  const target = docAndLocale(p.get("doc"), p.get("locale") ?? "fr");
  if (!target) return bad("Document inconnu.");
  const versions = (await historyOf(target.doc, target.locale)).map(({ content: _c, ...v }) => v);
  return NextResponse.json({ versions });
}

/** Retour en arrière en un clic : la version choisie est republiée (la version actuelle reste dans l'historique). */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = z.object({ doc: z.string(), locale: z.string(), version: z.string().max(80) }).safeParse(await req.json().catch(() => null));
  const target = parsed.success ? docAndLocale(parsed.data.doc, parsed.data.locale) : null;
  if (!parsed.success || !target) return bad("Demande illisible.");
  const v = await rollback(target.doc, target.locale, parsed.data.version, who.email);
  if (!v) return bad("Cette version n’existe plus.");
  await logAction({ agent: "systeme", kind: "edition", status: "done", summary: `Retour à une version précédente de « ${target.doc} » par ${who.email}` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
