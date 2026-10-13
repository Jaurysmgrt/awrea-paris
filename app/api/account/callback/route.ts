import { NextResponse, after } from "next/server";
import { exchangeAuthCode } from "@/lib/auth/customer";
import { ensureProfile } from "@/lib/customers";
import { syncCustomerToShopify } from "@/lib/customers/shopify-sync";

/** Retour de Google, d'Apple ou d'un lien de connexion reçu par e-mail. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/compte";
  const session = code ? await exchangeAuthCode(code) : null;
  if (!session) return NextResponse.redirect(new URL("/compte?connexion=echec", url));
  const terms = url.searchParams.get("cgu") ?? undefined;
  const profile = await ensureProfile(session, { termsVersion: terms });
  after(() => syncCustomerToShopify(profile).catch((e) => console.error("[compte] Shopify", e)));
  // sans CGU acceptées (première connexion par Google ou Apple), l'espace compte les demande d'abord
  return NextResponse.redirect(new URL(next, url));
}
