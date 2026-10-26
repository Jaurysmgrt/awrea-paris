import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { runCatalogueAgent } from "@/lib/agents/team/catalogue";
import { LEAD_TIME_BOUNDS } from "@/lib/commerce/availability";

export const maxDuration = 300;

const Weeks = z.number().int().min(LEAD_TIME_BOUNDS.min).max(LEAD_TIME_BOUNDS.max);

/** Nouvelle pièce : créée sur demande, sans stock ; tailles proposées, prix, délai de fabrication. */
const Body = z
  .object({
    notes: z.string().max(4000),
    name: z.string().max(80).optional(),
    category: z.enum(["robe", "body", "top", "jupe", "accessoire"]).optional(),
    collection: z.string().max(80).optional(),
    priceEuros: z.number().positive().max(100000),
    priceProvisional: z.boolean().optional(),
    leadTime: z.object({ min: Weeks, max: Weeks }).refine((t) => t.min <= t.max, "le délai minimal dépasse le délai maximal").optional(),
    leadTimeProvisional: z.boolean().optional(),
    sizes: z.array(z.enum(["XS", "S", "M", "L", "XL", "TU"])).min(1).max(6),
    mediaIds: z.array(z.string().regex(/^[a-z0-9]{6,40}$/)).min(1).max(8),
  })
  .strict();

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ") }, { status: 400 });
  const run = await runCatalogueAgent({ ...parsed.data, sizes: [...new Set(parsed.data.sizes)] }, "manuel");
  return NextResponse.json({ run });
}
