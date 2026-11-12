import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { logAction } from "@/lib/agents/log";
import { atelierHref } from "@/lib/admin/path";
import { runParcours, variableEnvoisReels } from "@/lib/marketing/parcours";
import { creerEmail } from "@/lib/marketing/parcours/emails";
import { creerDepuisModele, RefusParcours } from "@/lib/marketing/parcours/gestion";
import { MODELES } from "@/lib/marketing/parcours/modeles";
import { ecrireInterrupteur, ecrireReglages, listeParcours } from "@/lib/marketing/parcours/stockage";
import { PLAFOND_MAX, PLAFOND_MIN } from "@/lib/marketing/parcours/types";

const Corps = z.discriminatedUnion("action", [
  z.object({ action: z.literal("creer"), modele: z.enum(MODELES.map((m) => m.id) as [string, ...string[]]) }),
  z.object({ action: z.literal("reglages"), plafondJours: z.number().int().min(PLAFOND_MIN).max(PLAFOND_MAX) }),
  // allumer demande la confirmation de la créatrice ; couper est immédiat
  z.object({ action: z.literal("envois-reels"), actif: z.boolean(), confirme: z.literal(true).optional() }),
  z.object({ action: z.literal("lancer") }),
  z.object({ action: z.literal("email"), nom: z.string().trim().min(2).max(60) }),
]);

/**
 * Atelier › E-mails › Parcours : créer un parcours depuis un modèle (toujours en brouillon), régler le
 * plafond de fréquence, l'interrupteur des envois réels (seconde clé, avec PARCOURS_ENVOIS_REELS),
 * lancer un passage maintenant, créer un e-mail de parcours.
 */
export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Corps.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const body = parsed.data;
  try {
    switch (body.action) {
      case "creer": {
        const p = await creerDepuisModele(body.modele, me);
        return NextResponse.json({ ok: true, id: p.id, href: atelierHref(`/e-mails/parcours/${p.id}`) });
      }
      case "reglages":
        await ecrireReglages({ plafondJours: body.plafondJours });
        return NextResponse.json({ ok: true, message: "Réglage enregistré." });
      case "envois-reels": {
        if (body.actif && body.confirme !== true) return NextResponse.json({ error: "Confirmez d’abord les envois réels." }, { status: 400 });
        await ecrireInterrupteur(body.actif ? { actif: true, par: me, le: new Date().toISOString() } : { actif: false, par: me, le: new Date().toISOString() });
        const actifs = (await listeParcours()).filter((p) => p.statut === "actif").map((p) => p.nom);
        await logAction({
          agent: "systeme",
          kind: "parcours_envois_reels",
          status: "done",
          summary: body.actif ? `Envois réels des parcours autorisés par ${me}` : `Envois réels des parcours coupés par ${me}`,
          detail: JSON.stringify({ variable: variableEnvoisReels(), actifs }),
        });
        const message = !body.actif ? "Envois réels coupés : les parcours repassent en simulation." : variableEnvoisReels() ? "Envois réels autorisés." : "Votre accord est noté. Les e-mails partiront quand la Maison aura posé PARCOURS_ENVOIS_REELS dans Vercel.";
        return NextResponse.json({ ok: true, message });
      }
      case "lancer": {
        const b = await runParcours();
        if (b.occupe) return NextResponse.json({ error: "Un passage est déjà en cours. Réessayez dans un instant." }, { status: 409 });
        const verbe = b.mode === "reel" ? "envoyé" : "simulé";
        return NextResponse.json({ ok: true, bilan: b, message: `Passage fait : ${b.entrees} entrée${b.entrees > 1 ? "s" : ""}, ${b.envois} e-mail${b.envois > 1 ? "s" : ""} ${verbe}${b.envois > 1 ? "s" : ""}, ${b.sorties} sortie${b.sorties > 1 ? "s" : ""}.` });
      }
      case "email": {
        const id = await creerEmail(body.nom, me);
        return NextResponse.json({ ok: true, id, href: atelierHref(`/e-mails/${id}`) });
      }
    }
  } catch (e) {
    if (e instanceof RefusParcours) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("[parcours]", e);
    return NextResponse.json({ error: "Le geste n’a pas abouti. Réessayez." }, { status: 500 });
  }
}
