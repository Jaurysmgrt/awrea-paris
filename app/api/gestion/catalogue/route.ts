import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { runCatalogueAgent } from "@/lib/agents/team/catalogue";

export const maxDuration = 300;

const Body = z.object({
  notes: z.string().max(4000),
  name: z.string().max(80).optional(),
  category: z.enum(["robe", "body", "top", "jupe", "accessoire"]).optional(),
  collection: z.string().max(80).optional(),
  priceEuros: z.number().positive().max(100000),
  editionTotal: z.number().int().min(1).max(50),
  leadTimeWeeks: z.number().int().min(1).max(16).optional(),
  sizes: z.array(z.object({ size: z.enum(["XS", "S", "M", "L", "XL", "TU"]), quantity: z.number().int().min(0).max(50), preorder: z.boolean() })).min(1),
  mediaIds: z.array(z.string().regex(/^[a-z0-9]{6,40}$/)).min(1).max(8),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ") }, { status: 400 });
  const run = await runCatalogueAgent(parsed.data, "manuel");
  return NextResponse.json({ run });
}
