import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "@/lib/auth/session";
import { getOrders, statusLabel, trackingUrl } from "@/lib/commerce/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = verify<{ email: string }>((await cookies()).get("awrea_session")?.value);
  if (!session) return NextResponse.json({ user: null });
  const orders = (await getOrders())
    .filter((o) => o.email.toLowerCase() === session.email.toLowerCase())
    .map((o) => ({ ...o, statusLabel: statusLabel[o.status], trackingUrl: trackingUrl(o.shipping.carrier, o.shipping.tracking) }));
  return NextResponse.json({ user: { email: session.email }, orders });
}
