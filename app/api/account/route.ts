import { NextResponse } from "next/server";
import { getCustomerSession, authMode } from "@/lib/auth/customer";
import { getProfile, listAddresses, listOrders, getWishlist } from "@/lib/customers";
import { orderTimeline } from "@/lib/customers/order-timeline";
import { statusLabel, trackingUrl } from "@/lib/commerce/orders";
import { legalVersions } from "@/content/legal-versions";
import { certificatesFor } from "@/lib/certificates";
import { orderLink } from "@/lib/commerce/order-access";

export const dynamic = "force-dynamic";

/** Tout ce dont l'espace « Mon compte » a besoin, en un seul appel. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ user: null, mode: authMode });
  const [profile, orders, addresses, wishlist, certificates] = await Promise.all([
    getProfile(session),
    listOrders(session),
    listAddresses(session),
    getWishlist(session),
    certificatesFor(session).catch(() => []),
  ]);
  return NextResponse.json({
    mode: authMode,
    user: { id: session.id, email: session.email },
    profile,
    needsTerms: !profile?.termsAcceptedAt || profile.termsVersion !== legalVersions.cgu,
    // lien signé vers le suivi de chaque commande (retours, échanges et facture en libre-service),
    // et frise de sa confection : date de chaque étape, fin de confection prévue
    orders: orders.map((o) => ({
      ...o,
      statusLabel: statusLabel[o.status],
      trackingUrl: trackingUrl(o.shipping.carrier, o.shipping.tracking),
      followUrl: orderLink(o),
      timeline: orderTimeline(o),
    })),
    addresses,
    wishlist,
    certificates,
  });
}
