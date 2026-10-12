import { NextResponse, after } from "next/server";
import { runServiceClientAgent } from "@/lib/agents/team/service-client";
import { z } from "zod";
import { addInbox, type InboxMessage } from "@/lib/inbox";
import { sendEmail } from "@/lib/email/send";
import { identity } from "@/content/brand/identity";
import { brandEmail } from "@/lib/email/templates";


const Body = z.object({
  kind: z.enum(["contact", "rendez-vous"]),
  name: z.string().min(1).max(120),
  email: z.email(),
  subject: z.string().max(60).optional(),
  message: z.string().min(2).max(4000),
  orderNumber: z.string().max(40).optional(),
  appointmentType: z.string().max(40).optional(),
  preferredDate: z.string().max(20).optional(),
  slot: z.string().max(40).optional(),
  website: z.string().max(0).optional(), // piège à robots
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci de vérifier les champs du formulaire." }, { status: 400 });
  const d = parsed.data;
  const msg: InboxMessage = {
    id: `msg-${Date.now().toString(36)}`,
    date: new Date().toISOString(),
    channel: d.kind,
    name: d.name,
    email: d.email,
    subject: d.kind === "rendez-vous" ? `Rendez-vous — ${d.appointmentType ?? "essayage"}` : (d.subject ?? "autre"),
    message: d.message,
    orderNumber: d.orderNumber,
    appointment: d.kind === "rendez-vous" ? { type: d.appointmentType ?? "essayage", preferredDate: d.preferredDate, slot: d.slot } : undefined,
    status: "new",
  };
  await addInbox(msg);
  // accusé de réception à l'image de la marque
  await sendEmail({
    to: d.email,
    subject: d.kind === "rendez-vous" ? "Votre demande de rendez-vous" : "Nous avons bien reçu votre message",
    ...brandEmail({
      preheader: "L’atelier vous répond personnellement sous 48 heures ouvrées.",
      title: d.kind === "rendez-vous" ? "Votre rendez-vous à l’atelier" : "Merci pour votre message",
      paragraphs: [
        `Bonjour ${d.name},`,
        d.kind === "rendez-vous"
          ? "Nous avons bien reçu votre demande de rendez-vous. La créatrice vous écrira très vite pour vous proposer un créneau à l’atelier."
          : "Nous avons bien reçu votre message. L’atelier vous répond personnellement, en général sous 48 heures ouvrées.",
      ],
      signature: `Avec toute notre attention,\nl’atelier ${identity.name}`,
    }),
    tag: "accuse-reception",
  }).catch((e) => console.error("[contact] e-mail", e));
  // l'agent Service client traite le message juste après la réponse
  after(() => runServiceClientAgent("evenement").catch((e) => console.error("[agent service-client]", e)));
  return NextResponse.json({
    ok: true,
    message: d.kind === "rendez-vous" ? "Merci. La créatrice vous écrira très vite pour fixer le rendez-vous." : "Merci. L’atelier vous répond sous 48 heures ouvrées.",
  });
}
