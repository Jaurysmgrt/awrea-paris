import { NextResponse } from "next/server";
import { z } from "zod";
import { CONSENT_POLICY_VERSION } from "@/lib/consent";
import { recordConsent } from "@/lib/consent/store";
import { rateLimit } from "@/lib/security/rate-limit";

const Body = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{6,40}$/),
  analytics: z.boolean(),
  personalization: z.boolean(),
  advertising: z.boolean(),
  policy: z.literal(CONSENT_POLICY_VERSION),
  source: z.enum(["banner", "settings"]),
  path: z.string().max(200).default("/"),
});

/** Enregistre la preuve d'un choix de cookies (voir lib/consent/store.ts). */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "consent", { limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { id, analytics, personalization, advertising, policy, source, path } = parsed.data;
  try {
    await recordConsent({
      consentId: id,
      choices: { analytics, personalization, advertising },
      policy,
      source,
      path,
      userAgent: (req.headers.get("user-agent") ?? "").slice(0, 160),
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[consent]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
