import { NextResponse } from "next/server";
import * as z from "zod/v4";
import { editor, bad } from "@/lib/edition/api";
import { altFromName, ingestImage, mediaLibrary, MAX_UPLOAD } from "@/lib/edition/medias";
import { aiEnabled } from "@/lib/ai/client";
import { generateStructured } from "@/lib/ai/structured";
import { cleanGenerated } from "@/lib/writing/rules";

export const runtime = "nodejs";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Texte alternatif proposé : décrit par Claude quand il est branché, sinon tiré du nom du fichier. */
async function suggestAlt(data: Buffer, mediaType: string, name: string): Promise<string> {
  if (aiEnabled) {
    try {
      const out = await generateStructured({
        instructions: "Mission : décrire une photographie de la Maison pour une personne qui ne la voit pas. Une phrase de huit à seize mots : la pièce, la matière, la pose, le fond. Sans « image de » ni « photo de ». Aucun tiret, aucun adjectif creux.",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: data.toString("base64") } },
          { type: "text", text: `Nom du fichier déposé : ${name.slice(0, 80)}` },
        ],
        schema: z.object({ alt: z.string().max(180) }),
        effort: "low",
        maxTokens: 2000,
      });
      return cleanGenerated(out.alt.trim()).slice(0, 180);
    } catch (e) {
      console.error("[édition] texte alternatif", e instanceof Error ? e.message : e);
    }
  }
  return altFromName(name);
}

/** Dépôt d'une photo (déjà allégée dans le navigateur) : déclinaisons, point focal, texte alternatif proposé. */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const form = await req.formData().catch(() => null);
  const file = form?.get("fichier");
  if (!(file instanceof File)) return bad("Aucune photo reçue.");
  if (!TYPES.includes(file.type)) return bad("Déposez une photo au format JPEG, PNG, WebP ou AVIF.");
  if (file.size > MAX_UPLOAD) return bad("Cette photo est trop lourde (12 Mo au plus).");
  const data = Buffer.from(await file.arrayBuffer());
  try {
    const alt = await suggestAlt(data, file.type, file.name);
    const entry = await ingestImage(data, file.name, who.email, alt);
    return NextResponse.json({ ok: true, image: entry });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "La photo n’a pas pu être traitée.");
  }
}

/** Photos déjà déposées (médiathèque). */
export async function GET() {
  const who = await editor();
  if ("response" in who) return who.response;
  return NextResponse.json({ medias: (await mediaLibrary()).slice(0, 120) });
}
