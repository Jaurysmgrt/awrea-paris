import { NextResponse, after } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { accessLinkToken, accessSeconds, dropPhase, dropVars, getDrop, signUpForDrop, type Drop } from "@/lib/drops";
import type { AvantPremieresTexts } from "@/components/drops/regles";
import { getCustomerSession } from "@/lib/auth/customer";
import { readDoc } from "@/lib/edition/store";
import { fill } from "@/lib/edition/fill";
import { brandEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { absolute } from "@/lib/seo/metadata";

const Body = z.object({ email: z.email().max(254), turnstile: z.string().max(2048).optional() });
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);

/**
 * Inscription à l'avant-première d'une collection, depuis la page « Bientôt » : un lien personnel,
 * envoyé par e-mail, ouvre l'avant-première dans le navigateur (jusqu'au dévoilement). Contrôle
 * d'origine (proxy.ts), limitation de débit, Turnstile, validation Zod.
 * Réponses : { ok: true }, ou { error: code } (« email », « verification », « close »,
 * « generale ») ; les messages lisibles vivent dans content/site/fr/avant-premieres.json.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await rateLimit(req, "drop-signup", { limit: 6, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "email" }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstile, req))) return NextResponse.json({ error: "verification" }, { status: 400 });
  const { slug } = await params;
  const drop = Slug.safeParse(slug).success ? await getDrop(slug) : null;
  // une présentation privée ne prend aucune inscription ; une collection dévoilée n'en a plus besoin
  if (!drop || drop.privateSale || dropPhase(drop) === "ouvert") return NextResponse.json({ error: "close" }, { status: 404 });
  const email = parsed.data.email.trim().toLowerCase();
  const session = await getCustomerSession().catch(() => null);
  try {
    await signUpForDrop(slug, email, session && session.email.toLowerCase() === email ? session.id : undefined);
  } catch (e) {
    console.error("[avant-première] inscription", e);
    return NextResponse.json({ error: "generale" }, { status: 500 });
  }
  const link = absolute(`/bientot/${slug}/acces?t=${encodeURIComponent(accessLinkToken(slug, email, accessSeconds(drop)))}`);
  after(() => sendSignupEmail(email, drop, link).catch((e) => console.error("[avant-première] e-mail", e)));
  return NextResponse.json({ ok: true });
}

/** E-mail du lien personnel (textes : avant-premieres.json, emails.inscription). */
async function sendSignupEmail(email: string, drop: Drop, link: string) {
  const t = (await readDoc("avant-premieres", "fr")) as AvantPremieresTexts | null;
  if (!t) throw new Error("textes des avant-premières introuvables");
  const m = t.emails.inscription;
  const vars = dropVars(t, drop);
  const mail = brandEmail({
    preheader: fill(m.preheader, vars),
    title: fill(m.titre, vars),
    paragraphs: m.paragraphes.map((p) => fill(p, vars)),
    cta: { label: m.bouton, href: link },
    signature: m.signature,
  });
  await sendEmail({ to: email, subject: fill(m.objet, vars), tag: "avant-premiere-inscription", ...mail });
}
