import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmerLettre } from "@/lib/crm/lettre";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Bouton de la page /lettres/confirmation (« Confirmer mon inscription », ou « Appliquer mon
 * privilège ici » pour le lien demandé depuis un autre appareil) : jamais au simple chargement de la
 * page, pour qu'un antivirus qui ouvre les liens d'un e-mail ne confirme rien à la place de la
 * personne. Le jeton chiffré désigne l'adresse ; rien d'autre n'est lu. Un privilège valable est
 * rattaché à ce navigateur (cookie HttpOnly signé, lib/privilege/preuve.ts). Contrôle d'origine
 * (proxy.ts), limitation de débit, validation Zod.
 * Réponses : { ok: true, type: "lettre" | "appareil", privilege: { expireLe } | null } ;
 * { error: "invalide" } (lien expiré, faux, ou reçu avant une désinscription).
 */
const Body = z.object({ jeton: z.string().min(10).max(1024) }).strict();

export async function POST(req: Request) {
  const limited = await rateLimit(req, "lettre-confirmation", { limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalide" }, { status: 400 });
  try {
    const r = await confirmerLettre(parsed.data.jeton);
    if (r.etat === "invalide") return NextResponse.json({ error: "invalide" }, { status: 400 });
    return NextResponse.json({ ok: true, type: r.etat === "appareil" ? "appareil" : "lettre", privilege: r.privilege });
  } catch (e) {
    console.error("[lettre] confirmation", e);
    return NextResponse.json({ error: "generale" }, { status: 502 });
  }
}
