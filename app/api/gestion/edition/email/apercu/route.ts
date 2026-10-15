import { NextResponse } from "next/server";
import { z } from "zod";
import { editor, bad, docAndLocale } from "@/lib/edition/api";
import { documentInfo } from "@/lib/edition/documents";
import { siteUrl } from "@/lib/seo/metadata";
import { identity } from "@/content/brand/identity";
import { atelierHref } from "@/lib/admin/path";
import { formatPrice } from "@/lib/format";
import { getProducts, getProductsByHandles } from "@/lib/commerce";
import { EmailDocSchema } from "@/lib/email/schema";
import { emailCommon } from "@/lib/email/documents";
import { renderEmail } from "@/lib/email/render";
import type { EmailDoc } from "@/lib/email/blocks";

const Body = z.object({
  id: z.string(),
  locale: z.string().default("fr"),
  doc: z.unknown(),
  client: z.enum(["apple", "gmail", "outlook"]).default("apple"),
  dark: z.boolean().default(false),
  /** valeurs de l'aperçu : « si » et « sauf » s'essaient en cochant un cas */
  cas: z.record(z.string(), z.boolean()).default({}),
});

/** Aperçu d'un e-mail en cours de modification (rien n'est enregistré), avec les exemples de l'e-mail. */
export async function POST(req: Request) {
  const who = await editor();
  if ("response" in who) return who.response;
  const body = Body.safeParse(await req.json().catch(() => null));
  const target = body.success ? docAndLocale(body.data.id, body.data.locale) : null;
  if (!body.success || !target || (await documentInfo(target.doc))?.kind !== "email") return bad("E-mail inconnu.");
  const parsed = EmailDocSchema.safeParse(body.data.doc);
  if (!parsed.success) return bad("Aperçu impossible : un élément de l’e-mail n’est pas reconnu.");
  const doc = parsed.data as EmailDoc;
  const vars = Object.fromEntries(Object.entries(doc.variables).map(([k, v]) => [k, body.data.cas[k] === false ? "" : v.exemple]));
  const handles = doc.blocs.flatMap((b) => (b.type === "produit" ? ((b.pieces as string[] | undefined) ?? []) : []));
  const [commun, chosen, sample] = await Promise.all([
    emailCommon(target.locale, true),
    handles.length ? getProductsByHandles(handles, { includeUpcoming: true }).catch(() => []) : Promise.resolve([]),
    doc.blocs.some((b) => b.type === "commande") ? getProducts().then((l) => l.slice(0, 2)).catch(() => []) : Promise.resolve([]),
  ]);
  const mail = renderEmail(doc, {
    site: siteUrl,
    commun,
    instagram: identity.social.instagram,
    atelierHref,
    vars,
    client: body.data.client,
    dark: body.data.dark,
    unsubscribe: `${siteUrl}/lettres/desinscription`,
    products: Object.fromEntries(chosen.map((p) => [p.handle, { title: p.title, price: formatPrice(p.price), image: p.images[0]?.src, alt: p.images[0]?.alt, href: `/boutique/${p.handle}` }])),
    items: sample.map((p) => ({ title: p.title, meta: p.variants[0]?.size, price: formatPrice(p.price), image: p.images[0]?.src })),
    totals: sample.length ? [{ label: commun.total, value: formatPrice(sample.reduce((s, p) => s + p.price, 0)) }] : [],
  });
  return NextResponse.json(mail);
}
