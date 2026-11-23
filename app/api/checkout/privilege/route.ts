/**
 * Récapitulatif de paiement : le privilège de bienvenue s'applique-t-il au panier en cours pour
 * l'adresse e-mail saisie ? Seulement si l'adresse est prouvée dans ce navigateur (lien d'un e-mail
 * de la Maison ouvert ici, ou cliente connectée sous cette adresse, lib/privilege/preuve.ts) : sans
 * preuve, la réponse est la même pour toutes les adresses et rien n'est lu (aucun moyen de savoir si
 * une adresse est inscrite ou a déjà commandé). Seulement un montant et le nom de la pièce, jamais
 * rien sur la personne ; la commande refait le calcul elle-même (app/api/checkout). Contrôle
 * d'origine (proxy.ts), limitation de débit, validation Zod.
 * Réponse : { remise: { piece, montant } | null, nonCumulable: boolean, preuve: boolean }.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { readCart } from "@/lib/commerce/cart";
import { privilegePourPanier } from "@/lib/privilege";
import { adressePossedee } from "@/lib/privilege/preuve";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.email().max(254) }).strict();
const RIEN = { remise: null, nonCumulable: false, preuve: false };

export async function POST(req: Request) {
  const limited = await rateLimit(req, "checkout-privilege", { limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(RIEN);
  const preuve = await adressePossedee(parsed.data.email);
  if (!preuve) return NextResponse.json(RIEN);
  const cart = await readCart();
  if (!cart.lines.length) return NextResponse.json({ ...RIEN, preuve });
  const r = await privilegePourPanier(
    parsed.data.email,
    cart.lines.map((l) => ({ handle: l.productHandle, title: l.title, size: l.size, unitPrice: l.unitPrice, quantity: l.quantity })),
    { code: Boolean(cart.discount), preuve },
  ).catch((e) => {
    console.error("[checkout] privilège", e);
    return { remise: null, raison: undefined };
  });
  return NextResponse.json({ remise: r.remise ? { piece: r.remise.titre, montant: r.remise.montant } : null, nonCumulable: r.raison === "code", preuve });
}
