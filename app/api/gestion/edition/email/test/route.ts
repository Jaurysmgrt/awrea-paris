import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { documentInfo } from "@/lib/edition/documents";
import { emailDoc, sendDocEmail } from "@/lib/email/documents";
import { rateLimit } from "@/lib/security/rate-limit";

/** Envoie le brouillon de l'e-mail à la personne connectée, avec les exemples de l'e-mail. */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const limited = await rateLimit(req, "email-test", { limit: 10, windowSeconds: 3600 });
  if (limited) return limited;
  const body = z.object({ id: z.string(), locale: z.string().default("fr") }).safeParse(await req.json().catch(() => null));
  const target = body.success ? docAndLocale(body.data.id, body.data.locale) : null;
  if (!target || (await documentInfo(target.doc))?.kind !== "email") return bad("E-mail inconnu.");
  const doc = await emailDoc(target.doc, target.locale, true);
  if (!doc) return bad("E-mail inconnu.");
  const vars = Object.fromEntries(Object.entries(doc.variables).map(([k, v]) => [k, v.exemple]));
  const sent = await sendDocEmail(target.doc, who.email, { locale: target.locale, draft: true, vars, tag: "essai" });
  return NextResponse.json({ ok: true, delivered: sent.delivered, to: who.email });
}
