import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { essaiEmail } from "@/lib/marketing/parcours/emails";
import { changerStatut, enregistrer, retirer } from "@/lib/marketing/parcours/gestion";
import { unParcours } from "@/lib/marketing/parcours/stockage";
import { DefinitionSchema } from "@/lib/marketing/parcours/schema";
import { RefusParcours } from "@/lib/marketing/parcours/types";

const ID = /^p-[a-z0-9]{4,30}$/;

const Corps = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enregistrer"), definition: DefinitionSchema }),
  z.object({ action: z.literal("statut"), statut: z.enum(["actif", "pause"]) }),
  // l'essai part seulement à la personne connectée : aucune adresse n'est acceptée ici
  z.object({ action: z.literal("essai"), email: z.string().regex(/^email-[a-z0-9-]{1,74}$/) }).strict(),
]);

const refus = (e: unknown) => {
  if (e instanceof RefusParcours) return NextResponse.json({ error: e.message }, { status: 409 });
  console.error("[parcours]", e);
  return NextResponse.json({ error: "Le geste n’a pas abouti. Réessayez." }, { status: 500 });
};

/** Un parcours : l'enregistrer (brouillon ou en pause), l'activer ou le mettre en pause, s'envoyer un e-mail d'essai. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Parcours inconnu." }, { status: 404 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const body = parsed.data;
  try {
    if (body.action === "enregistrer") {
      await enregistrer(id, body.definition, me);
      return NextResponse.json({ ok: true, message: "Parcours enregistré." });
    }
    if (body.action === "statut") {
      const p = await changerStatut(id, body.statut, me);
      await logAction({ agent: "systeme", kind: "parcours_statut", status: "done", summary: `Parcours « ${p.nom} » ${body.statut === "actif" ? "activé" : "mis en pause"} par ${me}` });
      return NextResponse.json({ ok: true, message: body.statut === "actif" ? "Parcours actif." : "Parcours en pause." });
    }
    if (!(await unParcours(id))) return NextResponse.json({ error: "Parcours inconnu." }, { status: 404 });
    // seulement un e-mail de la lettre (vérifié par essaiEmail), seulement à vous
    await essaiEmail(body.email, me);
    return NextResponse.json({ ok: true, message: `Essai envoyé à ${me}.` });
  } catch (e) {
    return refus(e);
  }
}

/** Retire un parcours en brouillon ou en pause (ses suivis sont oubliés). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "Parcours inconnu." }, { status: 404 });
  try {
    await retirer(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return refus(e);
  }
}
