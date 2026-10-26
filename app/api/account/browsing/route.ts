import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/auth/customer";
import { clearBrowsing, recordBrowsing } from "@/lib/customers";

const Event = z.object({ kind: z.enum(["view", "collection", "search"]), handle: z.string().max(120).optional(), collection: z.string().max(120).optional() });

/** Pièce ou collection consultée (envoyé seulement avec le consentement « personnalisation »). */
export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return new NextResponse(null, { status: 204 });
  const parsed = Event.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordBrowsing(session, parsed.data).catch(() => {});
  return NextResponse.json({ ok: true });
}

/** Retrait du consentement : effacement immédiat. */
export async function DELETE() {
  const session = await getCustomerSession();
  if (session) await clearBrowsing(session);
  return NextResponse.json({ ok: true });
}
