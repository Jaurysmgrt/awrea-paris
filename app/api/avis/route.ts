import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { orderFromReviewToken, submitReview } from "@/lib/reviews";
import type { StoredMedia } from "@/lib/agents/team/catalogue";

const Photo = z.object({ data: z.string().max(950_000), width: z.number().int().positive().max(2000), height: z.number().int().positive().max(2000) });
const Body = z.object({
  number: z.string().trim().max(40),
  token: z.string().max(600),
  handle: z.string().regex(/^[a-z0-9-]+$/).max(80),
  body: z.string().trim().min(20).max(1500),
  fit: z.enum(["petite", "juste", "grande"]).optional(),
  photos: z.array(Photo).max(3).default([]),
  consent: z.literal(true),
  turnstile: z.string().max(2048).optional(),
});

/** Avis vérifié : seulement par le lien personnel reçu après l'achat, une fois par pièce. */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "avis", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Votre avis doit compter au moins vingt caractères, et la publication être acceptée." }, { status: 400 });
  const d = parsed.data;
  if (!(await verifyTurnstile(d.turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  const order = await orderFromReviewToken(d.number, d.token);
  if (!order) return NextResponse.json({ error: "Ce lien n’est plus valable." }, { status: 403 });
  // photos : JPEG recompressés dans le navigateur (métadonnées effacées) ; on vérifie la signature du fichier
  const ids: string[] = [];
  for (const p of d.photos) {
    const bytes = Buffer.from(p.data, "base64");
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return NextResponse.json({ error: "Une photo n’a pas pu être lue." }, { status: 400 });
    const id = `avis${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    const media: StoredMedia = { id, mediaType: "image/jpeg", data: p.data, width: p.width, height: p.height, name: "photo-cliente.jpg" };
    await kv.set(`media:${id}`, media);
    ids.push(id);
  }
  const r = await submitReview(order, { handle: d.handle, body: d.body, fit: d.fit, photos: ids });
  if (r !== "ok") {
    await Promise.all(ids.map((id) => kv.del(`media:${id}`)));
    return NextResponse.json({ error: r === "deja" ? "Vous avez déjà donné votre avis sur cette pièce. Merci." : "Cette pièce ne fait pas partie de la commande." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, message: "Merci. Votre avis sera publié après relecture par l’atelier." });
}
