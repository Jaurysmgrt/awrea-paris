import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { decide } from "@/lib/agents/perform";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ decision: z.enum(["approve", "reject"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Décision invalide" }, { status: 400 });
  try {
    const proposal = await decide((await params).id, parsed.data.decision);
    return NextResponse.json({ proposal });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
