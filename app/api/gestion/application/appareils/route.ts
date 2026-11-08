/**
 * Atelier › Application : appareils qui reçoivent les notifications. Réservé aux comptes de
 * l'Atelier (session à double authentification) ; origine contrôlée par proxy.ts (CSRF) ; entrées
 * validées ; seuls les services de notification des navigateurs sont acceptés comme destination.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { NOTIFICATIONS, nomAppareil, serviceAutorise, TYPES_NOTIFICATION, type TypeNotification } from "@/lib/admin/application";
import { appareilsVisibles, changerTypes, enregistrerAppareil, pushConfig, PushError, remplacerAbonnement, retirerAppareil } from "@/lib/admin/push";

export const dynamic = "force-dynamic";

const cle = z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+=*$/);
const Abonnement = z.object({ endpoint: z.string().url().max(1024), expirationTime: z.number().nullable().optional(), keys: z.object({ p256dh: cle, auth: cle }).strict() }).strict();
const Post = z.object({ abonnement: Abonnement }).strict();
const Put = z.object({ ancien: z.string().url().max(1024), abonnement: Abonnement }).strict();
const Patch = z.object({ id: z.string().uuid(), types: z.array(z.enum(TYPES_NOTIFICATION as [TypeNotification, ...TypeNotification[]])).max(TYPES_NOTIFICATION.length) }).strict();
const Delete = z.object({ id: z.string().uuid() }).strict();

const refus = (error: string, status = 400) => NextResponse.json({ error }, { status });
const lire = async (req: Request) => req.json().catch(() => null);
const SERVICE_INCONNU = "Ce navigateur passe par un service de notification inconnu : il ne peut pas recevoir les notifications de l’Atelier.";

export async function GET() {
  if (!(await currentAdmin())) return refus("Non autorisé", 401);
  return NextResponse.json({ config: pushConfig(), types: NOTIFICATIONS, appareils: await appareilsVisibles() });
}

export async function POST(req: Request) {
  const par = await currentAdmin();
  if (!par) return refus("Non autorisé", 401);
  if (!pushConfig().actif) return refus("Les notifications ne sont pas encore branchées : il manque les clés VAPID dans Vercel.", 409);
  const parsed = Post.safeParse(await lire(req));
  if (!parsed.success) return refus("Demande illisible.");
  const { endpoint, keys } = parsed.data.abonnement;
  if (!serviceAutorise(endpoint)) return refus(SERVICE_INCONNU);
  try {
    const appareil = await enregistrerAppareil({ endpoint, keys }, nomAppareil(req.headers.get("user-agent") ?? ""), par);
    return NextResponse.json({ ok: true, appareil });
  } catch (e) {
    if (e instanceof PushError) return refus(e.message, 409);
    throw e;
  }
}

/** Abonnement renouvelé par le navigateur lui-même (service worker). */
export async function PUT(req: Request) {
  if (!(await currentAdmin())) return refus("Non autorisé", 401);
  const parsed = Put.safeParse(await lire(req));
  if (!parsed.success) return refus("Demande illisible.");
  const { endpoint, keys } = parsed.data.abonnement;
  if (!serviceAutorise(endpoint)) return refus(SERVICE_INCONNU);
  if (!(await remplacerAbonnement(parsed.data.ancien, { endpoint, keys }))) return refus("Cet appareil ne reçoit plus les notifications.", 404);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!(await currentAdmin())) return refus("Non autorisé", 401);
  const parsed = Patch.safeParse(await lire(req));
  if (!parsed.success) return refus("Demande illisible.");
  try {
    return NextResponse.json({ ok: true, appareil: await changerTypes(parsed.data.id, parsed.data.types) });
  } catch (e) {
    if (e instanceof PushError) return refus(e.message, 404);
    throw e;
  }
}

export async function DELETE(req: Request) {
  if (!(await currentAdmin())) return refus("Non autorisé", 401);
  const parsed = Delete.safeParse(await lire(req));
  if (!parsed.success) return refus("Demande illisible.");
  await retirerAppareil(parsed.data.id);
  return NextResponse.json({ ok: true });
}
