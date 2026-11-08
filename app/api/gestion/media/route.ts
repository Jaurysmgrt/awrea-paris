import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { isAdmin } from "@/lib/auth/admin";
import type { StoredMedia } from "@/lib/agents/team/catalogue";

/** Dépôt d'une photo (déjà redimensionnée dans le navigateur, ≤ 1600 px, JPEG). */
const Body = z.object({
  name: z.string().max(120),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z.string().max(1_600_000),
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Image invalide ou trop lourde." }, { status: 400 });
  // identifiant imprévisible (32 caractères) : /api/media/<id> est public, et les photos d'une pièce
  // pas encore dévoilée ne doivent pas se deviner
  const id = crypto.randomUUID().replaceAll("-", "");
  const media: StoredMedia = { id, ...parsed.data };
  await kv.set(`media:${id}`, media);
  return NextResponse.json({ id, url: `/api/media/${id}` });
}
