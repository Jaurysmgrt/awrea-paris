import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { AUTONOMIES, LISTE_AUTONOMIES, regler, type Autonomie } from "@/lib/agents/autonomie";
import { logAction } from "@/lib/agents/log";

const Body = z.object({ autonomie: z.enum(LISTE_AUTONOMIES as [Autonomie, ...Autonomie[]]), actif: z.boolean() });

/** Atelier › Réglages : allumer ou couper ce qu'un agent fait seul (lib/agents/autonomie.ts). */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const reglages = await regler(parsed.data.autonomie, parsed.data.actif);
  await logAction({ agent: "systeme", kind: "reglage", status: "info", summary: `${parsed.data.actif ? "Rallumé" : "Coupé"} : ${AUTONOMIES[parsed.data.autonomie].titre}` });
  return NextResponse.json({ ok: true, reglages });
}
