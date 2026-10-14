/**
 * Audit technique du site (exécuté par l'agent SEO) : statut, temps de réponse, title, meta
 * description, H1 unique, images sans alt, canonique, données structurées, liens internes cassés,
 * titres en double.
 */
import { allPublicPaths } from "@/lib/seo/routes";

export interface AuditIssue {
  page: string;
  kind: "statut" | "lent" | "title" | "description" | "h1" | "alt" | "canonique" | "donnees-structurees" | "lien-casse" | "doublon";
  detail: string;
  severity: "haute" | "moyenne" | "basse";
}

export interface AuditReport {
  id: string;
  date: string;
  origin: string;
  pages: number;
  averageMs: number;
  score: number;
  issues: AuditIssue[];
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1];

export async function runSiteAudit(origin: string, maxPages = 80): Promise<AuditReport> {
  const paths = (await allPublicPaths()).map((p) => p.path).slice(0, maxPages);
  const issues: AuditIssue[] = [];
  const titles = new Map<string, string[]>();
  const links = new Set<string>();
  const times: number[] = [];

  for (const path of paths) {
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(origin + path, { headers: { "User-Agent": "AwreaSEOAgent/1.0" }, cache: "no-store" });
    } catch (e) {
      issues.push({ page: path, kind: "statut", detail: `Inaccessible : ${e instanceof Error ? e.message : e}`, severity: "haute" });
      continue;
    }
    const html = await res.text();
    const ms = Date.now() - t0;
    times.push(ms);
    if (res.status !== 200) issues.push({ page: path, kind: "statut", detail: `Statut HTTP ${res.status}`, severity: "haute" });
    if (ms > 1500) issues.push({ page: path, kind: "lent", detail: `Réponse en ${ms} ms (objectif < 800 ms)`, severity: ms > 3000 ? "haute" : "moyenne" });

    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    if (!title) issues.push({ page: path, kind: "title", detail: "Balise title absente", severity: "haute" });
    else if (title.length > 65) issues.push({ page: path, kind: "title", detail: `Title trop long (${title.length} caractères) : « ${title} »`, severity: "basse" });
    else if (title.length < 20) issues.push({ page: path, kind: "title", detail: `Title trop court : « ${title} »`, severity: "moyenne" });
    if (title) titles.set(title, [...(titles.get(title) ?? []), path]);

    const descTag = html.match(/<meta[^>]+name="description"[^>]*>/i)?.[0];
    const desc = descTag ? attr(descTag, "content") ?? "" : "";
    if (!desc) issues.push({ page: path, kind: "description", detail: "Meta description absente", severity: "haute" });
    else if (desc.length < 70 || desc.length > 170) issues.push({ page: path, kind: "description", detail: `Meta description de ${desc.length} caractères (idéal 140 à 160)`, severity: "basse" });

    const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
    if (h1 !== 1) issues.push({ page: path, kind: "h1", detail: `${h1} balise(s) H1 (une seule attendue)`, severity: "moyenne" });

    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    const noAlt = imgs.filter((t) => !/\balt\s*=/.test(t)).length;
    if (noAlt) issues.push({ page: path, kind: "alt", detail: `${noAlt} image(s) sans attribut alt`, severity: "moyenne" });

    if (!/<link[^>]+rel="canonical"/i.test(html) && !path.startsWith("/compte")) issues.push({ page: path, kind: "canonique", detail: "Lien canonique absent", severity: "basse" });

    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        JSON.parse(m[1]);
      } catch {
        issues.push({ page: path, kind: "donnees-structurees", detail: "JSON-LD invalide", severity: "haute" });
      }
    }
    if (!/application\/ld\+json/.test(html)) issues.push({ page: path, kind: "donnees-structurees", detail: "Aucune donnée structurée", severity: "moyenne" });

    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
      const href = m[1];
      if (!href.startsWith("/_next") && !href.startsWith("/api/") && !/\.(webp|png|jpg|svg|mp4|txt|xml|ico)$/.test(href)) links.add(href);
    }
  }

  for (const [title, pages] of titles) if (pages.length > 1) issues.push({ page: pages.join(", "), kind: "doublon", detail: `Title identique sur ${pages.length} pages : « ${title} »`, severity: "moyenne" });

  const known = new Set(paths);
  for (const href of [...links].filter((h) => !known.has(h)).slice(0, 60)) {
    try {
      const r = await fetch(origin + href, { method: "GET", cache: "no-store", redirect: "manual" });
      if (r.status >= 400) issues.push({ page: href, kind: "lien-casse", detail: `Lien interne en erreur (${r.status})`, severity: "haute" });
    } catch {
      issues.push({ page: href, kind: "lien-casse", detail: "Lien interne inaccessible", severity: "haute" });
    }
  }

  const weights = { haute: 6, moyenne: 3, basse: 1 };
  const penalty = issues.reduce((s, i) => s + weights[i.severity], 0);
  return {
    id: `audit-${Date.now().toString(36)}`,
    date: new Date().toISOString(),
    origin,
    pages: paths.length,
    averageMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
    score: Math.max(0, Math.round(100 - (penalty / Math.max(1, paths.length)) * 10)),
    issues,
  };
}
