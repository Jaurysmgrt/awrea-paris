/**
 * Contrôle de nuit des textes stockés, produits par les agents de gestion ou l'assistante : articles
 * du Journal publiés par l'agent SEO, fiches des pièces, brouillons de posts et de lettres, et les
 * signalements des dernières 24 heures (assistante, agents, éditeur).
 * Appelé par la maintenance quotidienne (scripts/maintenance-check.mjs) et par Vercel Cron.
 */
import { NextResponse } from "next/server";
import { kv } from "@/lib/store";
import { isCronAuthorized } from "@/lib/security/cron";
import { JOURNAL_KEY } from "@/lib/content/journal";
import { getAllProducts } from "@/lib/commerce";
import { scanTexts, type FieldIssue } from "@/lib/writing/agents";
import { listWritingReports } from "@/lib/writing/report";
import { logAction } from "@/lib/agents/log";
import type { Article } from "@/content/fr/journal";

export const dynamic = "force-dynamic";

interface Found {
  source: string;
  label: string;
  issues: Pick<FieldIssue, "path" | "rule" | "message" | "excerpt" | "suggestion">[];
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const found: Found[] = [];
  const add = (source: string, label: string, issues: FieldIssue[]) => {
    if (issues.length) found.push({ source, label, issues: issues.map(({ path, rule, message, excerpt, suggestion }) => ({ path, rule, message, excerpt, suggestion })) });
  };

  for (const a of (await kv.get<Article[]>(JOURNAL_KEY)) ?? []) add("Journal (agent SEO)", a.title, scanTexts({ title: a.title, excerpt: a.excerpt, body: a.body, seo: a.seo, alt: a.cover.alt }));
  for (const p of await getAllProducts().catch(() => [])) {
    add("Fiches des pièces", p.title, scanTexts({ title: p.title, tagline: p.tagline, description: p.description, care: p.care, fit: p.fit, details: p.details, seo: p.seo, alts: p.images.map((i) => i.alt) }));
  }
  for (const d of (await kv.get<{ title: string; body: string; subject?: string; preheader?: string }[]>("content:drafts")) ?? []) {
    add("Brouillons de contenus (agent Contenu)", d.title, scanTexts({ title: d.title, body: d.body, subject: d.subject, preheader: d.preheader }));
  }
  const reports = await listWritingReports(new Date(Date.now() - 24 * 3600 * 1000));

  const total = found.length + reports.length;
  if (total) {
    await logAction({
      agent: "systeme",
      kind: "ecriture",
      status: "info",
      summary: `Contrôle d’écriture de la nuit : ${total} texte(s) à relire`,
      detail: [...found.map((f) => `${f.source} · ${f.label} : ${f.issues.map((i) => i.message).join(" ")}`), ...reports.map((r) => `${r.source} : ${r.issues.map((i) => i.message).join(" ")}`)].join("\n").slice(0, 4000),
    }).catch(() => {});
  }
  return NextResponse.json({ date: new Date().toISOString(), aRelire: total, textes: found, signalements: reports });
}
