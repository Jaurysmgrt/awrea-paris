import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { listInbox, updateInbox } from "@/lib/inbox";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { logAction } from "@/lib/agents/log";
import { identity } from "@/content/brand/identity";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), subject: z.string().min(1).max(120), body: z.string().min(2).max(6000) }),
  z.object({ action: z.literal("close") }),
]);

/** Réponse envoyée par la créatrice elle-même (brouillon de l'agent relu et ajusté). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const msg = (await listInbox(2000)).find((m) => m.id === id);
  if (!msg) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  if (parsed.data.action === "close") {
    await updateInbox(id, { status: "answered" });
    await logAction({ agent: "systeme", kind: "message-clos", status: "info", summary: `Message de ${msg.email} classé par l’atelier` });
    return NextResponse.json({ ok: true });
  }
  const { subject, body } = parsed.data;
  await sendEmail({
    to: msg.email,
    subject,
    replyTo: process.env.ATELIER_EMAIL ?? identity.email,
    tag: "reponse-atelier",
    ...brandEmail({ preheader: body.slice(0, 90), title: subject, paragraphs: body.split(/\n{2,}/), signature: "La Créatrice" }),
  });
  await updateInbox(id, { status: "answered", answer: { body, date: new Date().toISOString(), by: "atelier" } });
  await logAction({ agent: "systeme", kind: "reponse-atelier", status: "done", summary: `Réponse de la créatrice envoyée à ${msg.email}`, target: { type: "message", id, label: msg.email } });
  return NextResponse.json({ ok: true });
}
