import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { runAgent } from "@/lib/agents/registry";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  try {
    const run = await runAgent(id, { origin: new URL(req.url).origin, trigger: "manuel" });
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
