import { NextResponse } from "next/server";
import { editor, bad } from "@/lib/edition/api";
import { cancelScheduled, runScheduled, scheduled } from "@/lib/edition/store";

/** Publications programmées (celles arrivées à échéance partent au passage). */
export async function GET() {
  const who = await editor();
  if ("response" in who) return who.response;
  await runScheduled();
  return NextResponse.json({ programme: (await scheduled()).map(({ content: _c, ...p }) => p) });
}

/** Annulation (DELETE depuis l'éditeur, POST depuis la liste des pages de l'Atelier). */
async function cancel(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^p-[a-z0-9-]{4,40}$/.test(id)) return bad("Programmation inconnue.");
  await cancelScheduled(id);
  return NextResponse.json({ ok: true });
}

export const DELETE = cancel;
export const POST = cancel;
