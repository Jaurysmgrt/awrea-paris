import { NextResponse } from "next/server";
import { grantDropAccess, verifyAccessLinkToken } from "@/lib/drops";

/** Lien personnel de l'e-mail d'accès anticipé : ouvre l'accès dans ce navigateur, puis la page du drop. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = new URL(req.url).searchParams.get("t");
  const token = verifyAccessLinkToken(t);
  const target = new URL(`/bientot/${slug}`, req.url);
  if (token?.d === slug) await grantDropAccess(slug, "anticipe");
  else target.searchParams.set("acces", "invalide");
  return NextResponse.redirect(target, 303);
}
