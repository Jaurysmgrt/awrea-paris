/**
 * Le 1er de chaque mois (Vercel Cron) : l'export comptable du mois écoulé (factures et avoirs),
 * envoyé à la comptabilité (ACCOUNTING_EMAIL, à défaut ATELIER_EMAIL) en pièce jointe.
 */
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/security/cron";
import { accountingCsv, listInvoices } from "@/lib/invoices";
import { sendEmail } from "@/lib/email/send";
import { brandEmail } from "@/lib/email/templates";
import { formatMonth } from "@/lib/format";
import { identity } from "@/content/brand/identity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const month = d.toISOString().slice(0, 7);
  const [csv, count] = await Promise.all([accountingCsv(month), listInvoices(month).then((l) => l.length)]);
  const to = process.env.ACCOUNTING_EMAIL || process.env.ATELIER_EMAIL || identity.email;
  await sendEmail({
    to,
    subject: `Export comptable — ${formatMonth(month)}`,
    tag: "export-comptable",
    attachments: [{ filename: `awrea-comptabilite-${month}.csv`, content: csv }],
    ...brandEmail({
      preheader: `${count} facture(s) et avoir(s) pour ${formatMonth(month)}.`,
      title: `Comptabilité — ${formatMonth(month)}`,
      paragraphs: [`Vous trouverez ci-joint l’export du mois : ${count} facture(s) et avoir(s), une ligne par pièce comptable, montants hors taxes, TVA et toutes taxes comprises.`, "Les factures en PDF restent disponibles dans l’Atelier, rubrique Factures."],
      cta: { label: "Ouvrir les factures", href: "atelier:/factures" },
    }),
  });
  return NextResponse.json({ ok: true, month, count, to: to.replace(/^(.).*(@.*)$/, "$1…$2") });
}
