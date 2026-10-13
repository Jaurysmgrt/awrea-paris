import { NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/require-customer";
import { revokeWishlistShare, shareWishlist } from "@/lib/customers";

/** Crée (ou renvoie) le lien secret de la liste d'envies. */
export async function POST(req: Request) {
  const { session, error } = await requireCustomer();
  if (error) return error;
  const token = await shareWishlist(session);
  // origine de la requête : le lien fonctionne aussi sur les environnements de prévisualisation
  return NextResponse.json({ url: new URL(`/liste-envies/partagee/${token}`, req.url).href });
}

/** Désactive le lien : la liste redevient privée. */
export async function DELETE() {
  const { session, error } = await requireCustomer();
  if (error) return error;
  await revokeWishlistShare(session);
  return NextResponse.json({ ok: true });
}
