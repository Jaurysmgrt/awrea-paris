import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { sign } from "@/lib/auth/session";

/**
 * Connexion du compte client — MODE DÉMONSTRATION.
 * En production, le compte client est celui de Shopify (Customer Account API : code à usage unique
 * envoyé par e-mail). Cette route n'est active qu'en l'absence de Shopify.
 */
export async function POST(req: Request) {
  if (process.env.SHOPIFY_STORE_DOMAIN) return NextResponse.json({ error: "Connexion gérée par Shopify." }, { status: 400 });
  const parsed = z.object({ email: z.email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  (await cookies()).set("awrea_session", sign({ email: parsed.data.email }, 60 * 60 * 24 * 30), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
