import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/auth/admin";
import { retirerCle } from "@/lib/auth/passkeys";
import { clientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit";

/** Réglages › Sécurité : retirer Face ID ou l'empreinte d'un appareil (perdu, vendu, changé). */
export async function POST(req: Request) {
  const email = await currentAdmin();
  if (!email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const parsed = z.object({ id: z.string().max(1024).regex(/^[A-Za-z0-9_-]+$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await retirerCle(email, parsed.data.id))) return NextResponse.json({ error: "Clé introuvable." }, { status: 404 });
  await logSecurityEvent("admin_passkey_removed", req, clientIp(req), email);
  return NextResponse.json({ ok: true });
}
