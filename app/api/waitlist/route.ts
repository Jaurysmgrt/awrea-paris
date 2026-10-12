import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { getProduct } from "@/lib/commerce";
import type { WaitlistEntry } from "@/lib/waitlist";


const Body = z.object({ email: z.email(), handle: z.string().min(1).max(120), size: z.string().max(4).nullable(), consent: z.literal(true) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide et d’accepter d’être prévenue." }, { status: 400 });
  const { email, handle, size } = parsed.data;
  const product = await getProduct(handle);
  if (!product) return NextResponse.json({ error: "Cette pièce n’existe plus." }, { status: 404 });
  const list = (await kv.get<WaitlistEntry[]>("waitlist")) ?? [];
  if (!list.some((w) => w.email.toLowerCase() === email.toLowerCase() && w.handle === handle && w.size === size && !w.notifiedAt)) {
    list.push({ email, handle, size, date: new Date().toISOString() });
    await kv.set("waitlist", list);
  }
  return NextResponse.json({ ok: true, message: `C’est noté. Nous vous écrirons dès qu’une pièce ${product.title}${size ? ` en taille ${size}` : ""} sortira de l’atelier.` });
}
