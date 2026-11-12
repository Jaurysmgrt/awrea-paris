import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmerLettre } from "@/lib/crm/lettre";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Confirmation de l'inscription à la lettre : appelée par la page /lettres/confirmation, depuis le
 * navigateur de la personne (un robot qui suit les liens d'un e-mail sans exécuter la page ne confirme
 * rien). Le jeton signé désigne l'adresse ; rien d'autre n'est lu. Contrôle d'origine (proxy.ts),
 * limitation de débit, validation Zod.
 * Réponses : { ok: true, privilege: { expireLe } | null } ; { error: "invalide" } (lien expiré, faux,
 * ou reçu avant une désinscription).
 */
const Body = z.object({ jeton: z.string().min(10).max(2048) }).strict();

export async function POST(req: Request) {
  const limited = await rateLimit(req, "lettre-confirmation", { limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalide" }, { status: 400 });
  try {
    const r = await confirmerLettre(parsed.data.jeton);
    if (r.etat === "invalide") return NextResponse.json({ error: "invalide" }, { status: 400 });
    return NextResponse.json({ ok: true, privilege: r.privilege });
  } catch (e) {
    console.error("[lettre] confirmation", e);
    return NextResponse.json({ error: "generale" }, { status: 502 });
  }
}
