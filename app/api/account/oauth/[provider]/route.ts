import { NextResponse } from "next/server";
import { oauthUrl } from "@/lib/auth/customer";
import { legalVersions } from "@/content/legal-versions";

/** Connexion avec Google ou Apple (Supabase Auth). */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "google" && provider !== "apple") return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 404 });
  const url = new URL(req.url);
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/compte";
  const accepted = url.searchParams.get("cgu") === "1";
  const target = await oauthUrl(provider, next, accepted ? legalVersions.cgu : undefined).catch(() => null);
  if (!target) return NextResponse.redirect(new URL(`/compte?connexion=${provider}-indisponible`, url));
  return NextResponse.redirect(target);
}
