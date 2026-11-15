/**
 * Atelier › Clientes : corriger les coordonnées d'une fiche (prénom, nom, téléphone). L'adresse
 * e-mail ne change pas : elle est la fiche. Réservé aux comptes de l'Atelier ; origine contrôlée par
 * proxy.ts (CSRF) ; entrées validées.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { trouverCliente } from "@/lib/admin/clientes-suivi";
import { corrigerFiche, CrmError } from "@/lib/crm";
import { NOM_MAX, TELEPHONE_MAX, telephoneValide } from "@/app/api/newsletter/regles";

export const dynamic = "force-dynamic";

const Texte = z.string().max(NOM_MAX).refine((v) => !/[\u0000-\u001f\u007f<>]/.test(v));
const Body = z
  .object({
    prenom: Texte.nullable().optional(),
    nom: Texte.nullable().optional(),
    telephone: z.string().max(TELEPHONE_MAX).refine(telephoneValide).nullable().optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const par = await currentAdmin();
  if (!par) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Vérifiez les champs : un nom sans signe spécial, un téléphone de 8 à 15 chiffres." }, { status: 400 });
  const cliente = await trouverCliente((await params).id);
  if (!cliente) return NextResponse.json({ error: "Cette fiche n’existe pas." }, { status: 404 });
  try {
    await corrigerFiche(cliente.email, parsed.data, par);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CrmError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[gestion/clientes/fiche]", e);
    return NextResponse.json({ error: "La fiche n’a pas pu être enregistrée. Merci de réessayer." }, { status: 502 });
  }
}
