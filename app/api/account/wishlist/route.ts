import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/require-customer";
import { getWishlist, setWishlist } from "@/lib/customers";

export async function GET() {
  const { session, error } = await requireCustomer();
  if (error) return error;
  return NextResponse.json({ handles: await getWishlist(session) });
}

/** Remplace la liste (la fusion avec la liste locale du navigateur est faite côté client). */
export async function PUT(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const parsed = z.object({ handles: z.array(z.string().max(120)).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Liste invalide." }, { status: 400 });
  return NextResponse.json({ handles: await setWishlist(session, parsed.data.handles) });
}
