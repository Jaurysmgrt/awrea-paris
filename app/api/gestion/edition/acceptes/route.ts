import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { acceptText } from "@/lib/edition/acceptes";

/** « Garder tel quel » : la créatrice a le dernier mot sur un texte signalé par le contrôle d'écriture. */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = z.object({ texte: z.string().min(1).max(4000), raison: z.string().max(200).optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Texte illisible.");
  await acceptText(parsed.data.texte, who.email, parsed.data.raison);
  return NextResponse.json({ ok: true });
}
