import { NextResponse } from "next/server";
import { getCustomerSession, authMode } from "@/lib/auth/customer";
import { getProfile, listAddresses, listOrders, listWaitlist, getWishlist } from "@/lib/customers";
import { statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { legalVersions } from "@/content/legal-versions";
import { certificatesFor } from "@/lib/certificates";

export const dynamic = "force-dynamic";

/** Tout ce dont l'espace « Mon compte » a besoin, en un seul appel. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ user: null, mode: authMode });
  const [profile, orders, addresses, waitlist, wishlist, certificates] = await Promise.all([
    getProfile(session),
    listOrders(session),
    listAddresses(session),
    listWaitlist(session),
    getWishlist(session),
    certificatesFor(session).catch(() => []),
  ]);
  return NextResponse.json({
    mode: authMode,
    user: { id: session.id, email: session.email },
    profile,
    needsTerms: !profile?.termsAcceptedAt || profile.termsVersion !== legalVersions.cgu,
    orders: orders.map((o) => ({ ...o, statusLabel: statusLabel[o.status], trackingUrl: trackingUrl(o.shipping.carrier, o.shipping.tracking) })),
    addresses,
    waitlist,
    wishlist,
    certificates,
  });
}
