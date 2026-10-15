import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { documentInfo } from "@/lib/edition/documents";
import { renderEmailDoc } from "@/lib/email/documents";

/**
 * Export de l'e-mail publié pour un service d'envoi : Brevo et Klaviyo (gabarit HTML importable,
 * repères dans leur syntaxe, lien de désinscription du service), ou notification Shopify (Liquid).
 */
export async function GET(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const p = new URL(req.url).searchParams;
  const target = docAndLocale(p.get("id"), p.get("locale") ?? "fr");
  const syntax = z.enum(["brevo", "klaviyo", "shopify"]).safeParse(p.get("pour"));
  if (!target || !syntax.success || (await documentInfo(target.doc))?.kind !== "email") return bad("Export impossible.");
  const mail = await renderEmailDoc(target.doc, { locale: target.locale, syntax: syntax.data });
  if (!mail) return bad("E-mail inconnu.");
  const name = `${target.doc}-${syntax.data}.${syntax.data === "shopify" ? "liquid" : "html"}`;
  return new Response(`<!-- Objet : ${mail.subject} -->\n${mail.html}`, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
