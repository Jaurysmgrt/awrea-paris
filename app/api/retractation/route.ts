import { NextResponse, after } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { addInbox } from "@/lib/inbox";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { getOrder } from "@/lib/commerce/orders";
import { kv } from "@/lib/store";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { runServiceClientAgent } from "@/lib/agents/team/service-client";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  order: z.string().trim().min(2).max(40),
  pieces: z.string().trim().max(300).optional().default(""),
  receivedAt: z.string().max(20).optional().default(""),
  turnstile: z.string().max(2048).optional(),
});

/**
 * Rétractation en ligne : la demande est horodatée, un accusé de réception est envoyé aussitôt
 * sur support durable (e-mail) et l'atelier est prévenu pour envoyer l'étiquette de retour.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "retractation", { limit: 5, windowSeconds: 3600 });
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Merci d’indiquer votre nom, votre e-mail et votre numéro de commande." }, { status: 400 });
  const d = parsed.data;
  if (!(await verifyTurnstile(d.turnstile, req))) return NextResponse.json({ error: "La vérification anti-robot a échoué. Merci de réessayer." }, { status: 400 });

  const at = new Date().toISOString();
  const reference = `RET-${randomBytes(3).toString("hex").toUpperCase()}`;
  const order = await getOrder(d.order).catch(() => null);
  const matches = Boolean(order && order.email.toLowerCase() === d.email.toLowerCase());
  const when = new Date(at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

  await kv.push("withdrawals", { reference, at, ...d, turnstile: undefined, orderFound: matches }, 2000);
  await addInbox({
    id: `msg-${Date.now().toString(36)}`,
    date: at,
    channel: "contact",
    name: d.name,
    email: d.email,
    subject: "retour",
    message: `Rétractation en ligne ${reference} pour la commande ${d.order}.${d.pieces ? ` Pièces concernées : ${d.pieces}.` : " Elle porte sur toutes les pièces."}${d.receivedAt ? ` Commande reçue le ${d.receivedAt}.` : ""}${matches ? "" : " (Commande non retrouvée avec cette adresse e-mail : à vérifier.)"}`,
    orderNumber: d.order,
    status: "new",
  });

  const mail = brandEmail({
    preheader: `Accusé de réception de votre rétractation (${reference}).`,
    title: "Votre rétractation est enregistrée",
    paragraphs: [
      `Bonjour ${d.name.split(" ")[0]},`,
      `Nous accusons réception de votre décision de vous rétracter, transmise le ${when} (heure de Paris), pour la commande ${d.order}${d.pieces ? ` (pièces concernées : ${d.pieces})` : ""}.`,
      "L’atelier vous adresse l’étiquette de retour. Merci de renvoyer la pièce dans les quatorze jours, non portée, avec ses étiquettes et son certificat. Le remboursement interviendra au plus tard quatorze jours après votre demande, sur le moyen de paiement utilisé, et peut être différé jusqu’à la réception de la pièce ou la preuve de son expédition.",
    ],
    signature: "Avec toute notre attention, l’atelier Awrea Paris.",
    footnote: `Référence ${reference} · à conserver comme preuve de votre demande.`,
  });
  await sendEmail({ to: d.email, subject: `Rétractation enregistrée pour la commande ${d.order}`, ...mail, tag: "retractation" }).catch((e) => console.error("[rétractation] e-mail", e));
  after(() => runServiceClientAgent("evenement").catch((e) => console.error("[agent service-client]", e)));
  return NextResponse.json({ ok: true, reference, at });
}
