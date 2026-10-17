import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { kv } from "@/lib/store";
import { listReviews, moderateReview } from "@/lib/reviews";

const Body = z.object({ id: z.uuid(), status: z.enum(["approved", "rejected"]), reply: z.string().trim().max(600).nullable().optional() });

/** Atelier : publier ou refuser un avis, avec une réponse de la créatrice si elle le souhaite. */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const review = (await listReviews()).find((r) => r.id === parsed.data.id);
  if (!review || !(await moderateReview(parsed.data.id, parsed.data.status, parsed.data.reply))) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  // un avis refusé ne garde pas ses photos
  if (parsed.data.status === "rejected") await Promise.all(review.photos.map((id) => kv.del(`media:${id}`)));
  revalidatePath(`/boutique/${review.productHandle}`);
  return NextResponse.json({ ok: true });
}
