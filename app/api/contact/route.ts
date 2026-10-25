import { NextResponse, after } from "next/server";
import { runServiceClientAgent } from "@/lib/agents/team/service-client";
import { z } from "zod";
import { addInbox, type InboxMessage } from "@/lib/inbox";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { getDoc } from "@/lib/edition/read";
import { fill } from "@/lib/edition/fill";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

/**
 * Message du formulaire de contact (maquette FORMULAIRE CONTACT) : prénom et e-mail obligatoires ;
 * nom, adresse, téléphone et informations complémentaires facultatifs. Le champ `name` (nom
 * complet) des anciens formulaires reste accepté à la place du prénom.
 * Protections : contrôle d'origine (proxy.ts), limitation de débit, validation Zod, piège à robots,
 * Turnstile. Le message est une donnée, jamais une instruction, pour l'agent Service client
 * (lib/ai/guard.ts). Textes : document « contact » (content/site/fr/contact.json).
 */
type ContactTexts = typeof import("@/content/site/fr/contact.json");

const text = (max: number) => z.string().trim().max(max).optional();

const Body = z
  .object({
    kind: z.enum(["contact", "rendez-vous"]).default("contact"),
    firstName: text(80),
    lastName: text(80),
    name: text(120),
    email: z.email().max(254),
    address: text(240),
    phone: z
      .string()
      .trim()
      .max(40)
      .regex(/^[0-9+().\s-]*$/)
      .optional(),
    subject: text(60),
    message: text(4000),
    orderNumber: text(40),
    appointmentType: text(40),
    preferredDate: text(20),
    slot: text(40),
    website: z.string().max(0).optional(), // piège à robots
    turnstile: z.string().max(2048).optional(),
  })
  .refine((d) => Boolean(d.firstName || d.name), { path: ["firstName"] });

export async function POST(req: Request) {
  const t = await getDoc<ContactTexts>("contact", "fr", { plain: true });
  const limited = await rateLimit(req, "contact", { limit: 6, windowSeconds: 600 }, t.reponses.tropDeDemandes);
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: t.reponses.invalide }, { status: 400 });
  const d = parsed.data;
  if (!(await verifyTurnstile(d.turnstile, req))) return NextResponse.json({ error: t.reponses.robot }, { status: 400 });

  const name = [d.firstName, d.lastName].filter(Boolean).join(" ") || d.name || "";
  const prenom = d.firstName || name.split(" ")[0];
  const msg: InboxMessage = {
    id: `msg-${Date.now().toString(36)}`,
    date: new Date().toISOString(),
    channel: d.kind,
    name,
    email: d.email,
    subject: d.kind === "rendez-vous" ? `Rendez-vous, ${d.appointmentType ?? "essayage"}` : (d.subject || t.boite.objet),
    message: d.message || t.boite.sansMessage,
    orderNumber: d.orderNumber,
    // coordonnées facultatives : rangées à part, lues par la créatrice dans l'Atelier › Messages
    ...(d.phone ? { phone: d.phone } : {}),
    ...(d.address ? { address: d.address } : {}),
    appointment: d.kind === "rendez-vous" ? { type: d.appointmentType ?? "essayage", preferredDate: d.preferredDate, slot: d.slot } : undefined,
    status: "new",
  };
  await addInbox(msg);
  // accusé de réception à l'image de la Maison
  await sendEmail({
    to: d.email,
    subject: t.accuse.objet,
    ...brandEmail({
      preheader: t.accuse.apercu,
      title: t.accuse.titre,
      paragraphs: [fill(t.accuse.bonjour, { prenom }), t.accuse.texte],
      signature: t.accuse.signature,
    }),
    tag: "accuse-reception",
  }).catch((e) => console.error("[contact] e-mail", e));
  // l'agent Service client traite le message juste après la réponse
  after(() => runServiceClientAgent("evenement").catch((e) => console.error("[agent service-client]", e)));
  return NextResponse.json({ ok: true, message: fill(t.reponses.merci, { prenom }) });
}
