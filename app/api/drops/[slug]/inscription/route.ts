import { NextResponse, after } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { accessLinkToken, dropPhase, getDrop, signUpForDrop } from "@/lib/drops";
import { getCustomerSession } from "@/lib/auth/customer";
import { brandEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { absolute } from "@/lib/seo/metadata";

const Body = z.object({ email: z.email(), turnstile: z.string().max(2048).optional() });

const parisDate = (iso: string) => new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Inscription à l'accès anticipé d'un drop : un lien personnel ouvre l'accès dans le navigateur. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limited = await rateLimit(req, "drop-signup", { limit: 6, windowSeconds: 600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer une adresse e-mail valide." }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });
  const { slug } = await params;
  const drop = await getDrop(slug);
  if (!drop || drop.privateSale || dropPhase(drop) === "ouvert") return NextResponse.json({ error: "Les inscriptions à cette série sont closes." }, { status: 404 });
  const { email } = parsed.data;
  const session = await getCustomerSession().catch(() => null);
  await signUpForDrop(slug, email, session && session.email.toLowerCase() === email.toLowerCase() ? session.id : undefined);
  const link = absolute(`/bientot/${slug}/acces?t=${encodeURIComponent(accessLinkToken(slug, email))}`);
  after(async () => {
    const mail = brandEmail({
      preheader: `Votre accès anticipé à ${drop.title} est réservé.`,
      title: "Votre accès anticipé",
      paragraphs: [
        "Bonjour,",
        `Vous êtes inscrite à l’accès anticipé de ${drop.title}. Les pièces vous seront ouvertes ${parisDate(drop.earlyAccessAt)}, avant tout le monde ; l’ouverture à toutes aura lieu ${parisDate(drop.publicAt)}.`,
        "Ce lien est personnel : ouvrez-le depuis le téléphone ou l’ordinateur avec lequel vous ferez votre achat.",
      ],
      cta: { label: "Ouvrir mon accès", href: link },
      signature: "Avec toute notre gratitude,\nLa Créatrice",
    });
    await sendEmail({ to: email, subject: `${drop.title}, votre accès anticipé`, tag: "drop-acces", ...mail }).catch((e) => console.error("[drops] e-mail", e));
  });
  return NextResponse.json({ ok: true, message: "C’est noté. Votre lien d’accès vient de partir par e-mail." });
}
