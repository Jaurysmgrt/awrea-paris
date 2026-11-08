/**
 * Atelier › Application : notification d'essai envoyée à un seul appareil, pour vérifier qu'elle
 * arrive. Réservé aux comptes de l'Atelier ; origine contrôlée par proxy.ts ; entrée validée.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { appareils, notifierAtelier, pushConfig } from "@/lib/admin/push";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().uuid() }).strict();

export async function POST(req: Request) {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!pushConfig().actif) return NextResponse.json({ error: "Les notifications ne sont pas encore branchées : il manque les clés VAPID dans Vercel." }, { status: 409 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Demande illisible." }, { status: 400 });
  if (!(await appareils()).some((a) => a.id === parsed.data.id)) return NextResponse.json({ error: "Cet appareil ne reçoit plus les notifications." }, { status: 404 });
  const n = await notifierAtelier({ type: "intervention", titre: "Essai de notification", texte: "Les notifications de l’Atelier arrivent bien sur cet appareil.", chemin: "/application", etiquette: "essai" }, parsed.data.id);
  if (!n) return NextResponse.json({ error: "La notification n’est pas partie. Réessayez dans un instant ; si cela recommence, retirez cet appareil puis ajoutez-le de nouveau." }, { status: 502 });
  return NextResponse.json({ ok: true, message: "Notification envoyée. Elle arrive en général en quelques secondes." });
}
