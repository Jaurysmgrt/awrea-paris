import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad } from "@/lib/edition/api";
import { documentInfo, unregisterPage } from "@/lib/edition/documents";
import { isDocId, removeDoc } from "@/lib/edition/store";
import { logAction } from "@/lib/agents/log";

/** Supprime une page créée depuis un modèle (jamais une page du site ni un e-mail). */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const parsed = z.object({ id: z.string().refine(isDocId) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Page inconnue.");
  const info = await documentInfo(parsed.data.id);
  if (info?.kind !== "modele") return bad("Seules les pages créées dans l’éditeur peuvent être supprimées.");
  await removeDoc(info.id, who.email);
  await unregisterPage(info.id);
  await logAction({ agent: "systeme", kind: "edition", status: "done", summary: `Page « ${info.label} » supprimée par ${who.email}` }).catch(() => {});
  return NextResponse.json({ ok: true });
}
