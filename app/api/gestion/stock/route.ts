import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { EXECUTORS } from "@/lib/agents/actions";
import { logAction } from "@/lib/agents/log";

/** Mise à jour d'un stock par la créatrice (même exécution que celle des agents). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ handle: z.string(), size: z.enum(["XS", "S", "M", "L", "XL", "TU"]), quantity: z.number().int().min(0).max(100) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  try {
    const r = await EXECUTORS.update_stock(parsed.data);
    await logAction({ agent: "systeme", kind: "update_stock", status: "done", summary: `Par l’atelier · ${r.summary}`, target: r.target });
    return NextResponse.json({ ok: true, summary: r.summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
