import { NextResponse, after } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { deleteDrop, getDrop, saveDrop } from "@/lib/drops";
import { sendDropLetters } from "@/lib/marketing/flows";

/**
 * Atelier : annoncer ou modifier une avant-première (nom de la collection, texte, images, pièces,
 * dates, présentation privée et son mot de passe, lettre aux inscrites). Session de l'Atelier et
 * double authentification exigées (isAdmin), contrôle d'origine par proxy.ts, validation Zod.
 * Réponses : { ok: true, slug }, ou { error: code } (« donnees », « dates », « motDePasse ») ;
 * les messages lisibles vivent dans content/site/fr/avant-premieres.json (atelier.erreurs).
 */
const Path = z.string().trim().regex(/^\/media\/[a-z0-9/_-]+$/).max(200);

const Drop = z
  .object({
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
    title: z.string().trim().min(2).max(80),
    teaser: z.string().trim().min(2).max(2400),
    images: z.array(Path).max(12).default([]),
    products: z.array(z.string().regex(/^[a-z0-9-]+$/).max(80)).max(40).default([]),
    earlyAccessAt: z.iso.datetime(),
    publicAt: z.iso.datetime(),
    privateSale: z.boolean(),
    notifyLetters: z.boolean().default(false),
    password: z.string().min(6).max(120).nullable().optional(),
  })
  .refine((d) => Date.parse(d.earlyAccessAt) <= Date.parse(d.publicAt), { message: "dates" });

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Drop.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.some((i) => i.message === "dates") ? "dates" : "donnees" }, { status: 400 });
  const d = parsed.data;
  // une présentation privée sans mot de passe enregistré n'aurait aucun accès
  if (d.privateSale && !d.password && !(await getDrop(d.slug))?.passwordHash) return NextResponse.json({ error: "motDePasse" }, { status: 400 });
  const drop = await saveDrop({ ...d, images: [...new Set(d.images)], products: [...new Set(d.products)], notifyLetters: d.notifyLetters && !d.privateSale });
  // la lettre aux inscrites part après la réponse, une fois par inscrite et par collection
  if (drop.notifyLetters) after(() => sendDropLetters(drop).catch((e) => console.error("[avant-première] lettre", e)));
  return NextResponse.json({ ok: true, slug: drop.slug });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) return NextResponse.json({ error: "donnees" }, { status: 400 });
  await deleteDrop(slug);
  return NextResponse.json({ ok: true });
}
