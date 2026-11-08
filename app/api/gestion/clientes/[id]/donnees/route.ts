/**
 * Atelier › Clientes : les données d'une cliente, à lui remettre quand elle les demande (droit
 * d'accès, RGPD) : profil, adresses, envies, navigation, avant-premières, avis, commandes et notes de
 * l'atelier. Fichier JSON téléchargé par la créatrice ; la demande est notée au registre RGPD, sans
 * donnée personnelle. Réservé aux comptes de l'Atelier.
 */
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { donneesCliente, trouverCliente } from "@/lib/admin/clientes-suivi";
import { kv } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const cliente = await trouverCliente((await params).id);
  if (!cliente) return NextResponse.json({ error: "Cette cliente n’existe pas." }, { status: 404 });
  let donnees: Awaited<ReturnType<typeof donneesCliente>>;
  try {
    donnees = await donneesCliente(cliente);
  } catch (e) {
    // jamais un fichier incomplet : l'export échoue et le dit
    console.error("[gestion/clientes/donnees]", e);
    return NextResponse.json({ error: "Ses données n’ont pas pu être toutes lues. Rien n’a été téléchargé : réessayez dans un instant." }, { status: 502 });
  }
  await kv.push("rgpd:requests", { kind: "accès (Atelier)", at: new Date().toISOString() }, 1000);
  return new NextResponse(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-cliente-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
