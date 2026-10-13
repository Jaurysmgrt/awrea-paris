import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/store";
import { getProduct } from "@/lib/commerce";
import type { WaitlistEntry } from "@/lib/waitlist";
import { getCustomerSession } from "@/lib/auth/customer";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/db/supabase";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

const Body = z.object({
  email: z.email(),
  handle: z.string().min(1).max(120),
  size: z.string().max(4).nullable(),
  consent: z.literal(true),
  turnstile: z.string().max(2048).optional(),
});

/** Alerte de retour en stock : enregistrée (et rattachée au compte de la cliente connectée). */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "waitlist", { limit: 10, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide et d’accepter d’être prévenue." }, { status: 400 });
  const { email, handle, size, turnstile } = parsed.data;
  if (!(await verifyTurnstile(turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  const product = await getProduct(handle);
  if (!product) return NextResponse.json({ error: "Cette pièce n’existe plus." }, { status: 404 });
  const list = (await kv.get<WaitlistEntry[]>("waitlist")) ?? [];
  if (!list.some((w) => w.email.toLowerCase() === email.toLowerCase() && w.handle === handle && w.size === size && !w.notifiedAt)) {
    list.push({ email, handle, size, date: new Date().toISOString() });
    await kv.set("waitlist", list);
  }
  if (isSupabaseConfigured) {
    const session = await getCustomerSession();
    await supabaseAdmin()
      .from("waitlist_entries")
      .upsert(
        { email, product_handle: handle, size, customer_id: session && session.email.toLowerCase() === email.toLowerCase() ? session.id : null },
        { onConflict: "email,product_handle,size", ignoreDuplicates: true },
      )
      .then(({ error }) => error && console.error("[waitlist] base clientes", error.message));
  }
  return NextResponse.json({ ok: true, message: `C’est noté. Nous vous écrirons dès qu’une pièce ${product.title}${size ? ` en taille ${size}` : ""} sortira de l’atelier.` });
}
