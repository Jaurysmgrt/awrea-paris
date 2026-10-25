import { NextResponse } from "next/server";
import { accessSeconds, getDrop, grantDropAccess, verifyAccessLinkToken } from "@/lib/drops";

/**
 * Lien personnel de l'e-mail d'avant-première (inscription sur la page ou lettre de la Maison) :
 * ouvre l'avant-première dans ce navigateur, jusqu'au dévoilement, puis mène à la page de la
 * collection. Un lien expiré ou étranger à cette collection y mène aussi, avec un mot d'explication.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = verifyAccessLinkToken(new URL(req.url).searchParams.get("t"));
  const target = new URL(`/bientot/${encodeURIComponent(slug)}`, req.url);
  const drop = token?.d === slug ? await getDrop(slug) : null;
  if (drop && !drop.privateSale) await grantDropAccess(slug, "anticipe", accessSeconds(drop));
  else target.searchParams.set("acces", "invalide");
  return NextResponse.redirect(target, 303);
}
