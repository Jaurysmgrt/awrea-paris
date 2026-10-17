import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { kv } from "@/lib/store";

type Draft = { id: string; status: "draft" | "published" | "archived" };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ status: z.enum(["published", "archived"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  const { id } = await params;
  const all = await kv.list<Draft>("content:drafts", 200);
  const next = all.map((d) => (d.id === id ? { ...d, status: parsed.data.status } : d));
  await kv.del("content:drafts");
  for (const d of next.reverse()) await kv.push("content:drafts", d, 200);
  return NextResponse.json({ ok: true });
}
