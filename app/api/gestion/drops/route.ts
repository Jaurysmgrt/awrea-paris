import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { deleteDrop, saveDrop } from "@/lib/drops";

const Drop = z
  .object({
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
    title: z.string().trim().min(2).max(80),
    teaser: z.string().trim().min(2).max(400),
    image: z.string().trim().regex(/^\/media\/[a-z0-9/_-]+$/).optional().or(z.literal("").transform(() => undefined)),
    products: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(40),
    earlyAccessAt: z.iso.datetime(),
    publicAt: z.iso.datetime(),
    privateSale: z.boolean(),
    password: z.string().min(6).max(120).nullable().optional(),
  })
  .refine((d) => Date.parse(d.earlyAccessAt) <= Date.parse(d.publicAt), { message: "L’accès anticipé doit précéder l’ouverture à toutes." });

/** Atelier : créer ou modifier un drop (dates, pièces, vente privée). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Drop.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const d = parsed.data;
  if (d.privateSale && !d.password) {
    // une vente privée sans mot de passe enregistré n'aurait aucun accès
    const { getDrop } = await import("@/lib/drops");
    const previous = await getDrop(d.slug);
    if (!previous?.passwordHash) return NextResponse.json({ error: "Choisissez le mot de passe de la vente privée." }, { status: 400 });
  }
  const drop = await saveDrop(d);
  return NextResponse.json({ ok: true, slug: drop.slug });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Drop inconnu." }, { status: 400 });
  await deleteDrop(slug);
  return NextResponse.json({ ok: true });
}
