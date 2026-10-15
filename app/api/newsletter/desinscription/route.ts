import { NextResponse } from "next/server";
import { emailOfToken, unsubscribe } from "@/lib/marketing/unsubscribe";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Désinscription en un clic : POST depuis la messagerie (RFC 8058, en-tête List-Unsubscribe-Post)
 * ou depuis la page de confirmation du site. Le jeton signé désigne l'adresse ; rien d'autre n'est lu.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "desinscription", { limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const email = emailOfToken(new URL(req.url).searchParams.get("jeton"));
  if (!email) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  await unsubscribe(email);
  return NextResponse.json({ ok: true });
}
