import { NextResponse } from "next/server";
import { z } from "zod";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { currentAdmin, takePasskeyChallenge } from "@/lib/auth/admin";
import { terminerAjout } from "@/lib/auth/passkeys";
import { clientIp } from "@/lib/security/rate-limit";
import { alertPasskeyAdded, device } from "@/lib/security/audit";
import { logAction } from "@/lib/agents/log";

const b64url = z.string().max(16_384).regex(/^[A-Za-z0-9_-]*$/);
const Body = z.object({
  id: b64url.max(1024),
  rawId: b64url.max(1024),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: b64url,
    attestationObject: b64url,
    authenticatorData: b64url.optional(),
    transports: z.array(z.enum(["ble", "cable", "hybrid", "internal", "nfc", "smart-card", "usb"])).max(8).optional(),
    publicKeyAlgorithm: z.number().int().optional(),
    publicKey: b64url.optional(),
  }),
  clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

/** Réglages › Sécurité : ajouter Face ID ou l'empreinte de cet appareil, étape 2 (réponse de l'appareil). */
export async function POST(req: Request) {
  const email = await currentAdmin();
  if (!email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const challenge = await takePasskeyChallenge("ajout");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!challenge || !parsed.success) return NextResponse.json({ error: "Le délai est passé : recommencez." }, { status: 400 });
  try {
    const cle = await terminerAjout(email, parsed.data as RegistrationResponseJSON, challenge, req, device(req.headers.get("user-agent")));
    await alertPasskeyAdded(email, req, clientIp(req));
    await logAction({ agent: "systeme", kind: "sécurité", status: "info", summary: `Face ID ou empreinte ajouté pour ${email} (${cle.label})` }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "La clé n’a pas pu être enregistrée." }, { status: 400 });
  }
}
