import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { runCatalogueAgent } from "@/lib/agents/team/catalogue";
import { LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";
import { PHOTOS_MAX, PRIX_MAX, PRIX_MIN } from "@/lib/commerce/statut-pieces";

export const maxDuration = 300;

const Weeks = z.number().int().min(LEAD_TIME_BOUNDS.min).max(LEAD_TIME_BOUNDS.max);

/** Nouvelle pièce, toujours en brouillon : créée sur demande, sans stock ; tailles proposées, prix, délai de fabrication. */
const Body = z
  .object({
    notes: z.string().max(4000),
    name: z.string().max(80).optional(),
    category: z.enum(["robe", "body", "top", "jupe", "accessoire"]).optional(),
    collection: z.string().max(80).optional(),
    priceEuros: z.number().min(PRIX_MIN).max(PRIX_MAX),
    priceProvisional: z.boolean().optional(),
    leadTime: z.object({ min: Weeks, max: Weeks }).refine((t) => t.min <= t.max, "le délai minimal dépasse le délai maximal").optional(),
    leadTimeProvisional: z.boolean().optional(),
    sizes: z.array(z.enum(["XS", "S", "M", "L", "XL", "TU"])).min(1).max(6),
    mediaIds: z.array(z.string().regex(/^[a-z0-9]{6,40}$/)).min(1).max(PHOTOS_MAX),
  })
  .strict();

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // en mots simples : ce qui est à revoir, jamais le message technique de la validation
    const champs = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    const aRevoir = [
      champs.has("priceEuros") && `le prix (de ${PRIX_MIN} à ${PRIX_MAX.toLocaleString("fr-FR")} €)`,
      champs.has("leadTime") && `le délai (semaines entières, de ${LEAD_TIME_BOUNDS.min} à ${LEAD_TIME_BOUNDS.max})`,
      champs.has("sizes") && "les tailles (une au moins)",
      champs.has("mediaIds") && `les photos (de 1 à ${PHOTOS_MAX})`,
      champs.has("name") && "le nom (80 caractères au plus)",
      champs.has("notes") && "vos notes (4 000 caractères au plus)",
    ].filter(Boolean);
    return NextResponse.json({ error: aRevoir.length ? `À revoir : ${aRevoir.join(", ")}.` : "Ces informations n’ont pas pu être lues. Merci de réessayer." }, { status: 400 });
  }
  const { handle, ...run } = await runCatalogueAgent({ ...parsed.data, sizes: [...new Set(parsed.data.sizes)], mediaIds: [...new Set(parsed.data.mediaIds)] }, "manuel");
  // la pièce créée (toujours en brouillon) : l'Atelier ouvre sa fiche
  return NextResponse.json({ run, ...(handle ? { handle } : {}) });
}
