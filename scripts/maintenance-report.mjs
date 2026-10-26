#!/usr/bin/env node
/**
 * Rapport quotidien de l'agent de maintenance : une ligne datée dans JOURNAL.md (section
 * « Maintenance quotidienne ») et un résumé dans le tableau de bord Atelier
 * (POST /api/cron/maintenance, avec CRON_SECRET).
 *
 * Entrées : maintenance/bilan.json (scripts/maintenance-check.mjs) et l'environnement :
 *   REPAIR_PR_URL   demande de fusion ouverte par Claude Code (correction testée, fusion automatique au vert)
 *   REPAIR_NOTE     explication laissée par Claude Code quand il n'a pas pu corriger (maintenance/rapport.md)
 *   ROLLED_BACK=1   le dernier déploiement a été annulé (retour à la version précédente)
 *   RUN_URL, SITE_URL, CRON_SECRET
 */
import fs from "node:fs";

const bilan = fs.existsSync("maintenance/bilan.json") ? JSON.parse(fs.readFileSync("maintenance/bilan.json", "utf8")) : { status: "echec", checks: [] };
const failed = bilan.checks.filter((c) => !c.ok).map((c) => c.name);
const total = bilan.checks.length;
const pr = process.env.REPAIR_PR_URL || "";
const note = process.env.REPAIR_NOTE || (fs.existsSync("maintenance/rapport.md") ? fs.readFileSync("maintenance/rapport.md", "utf8").trim() : "");

let status, summary;
if (process.env.ROLLED_BACK === "1") {
  status = "annule";
  summary = "Le dernier déploiement ne passait pas les contrôles du site en ligne : retour automatique à la version précédente.";
} else if (bilan.status === "ok") {
  status = "ok";
  summary = `Tout est en ordre : ${total}/${total} contrôles au vert.`;
} else if (pr) {
  status = "corrige";
  summary = `${failed.length} contrôle(s) en échec, corrigé(s) et testé(s) : la correction est mise en ligne dès que tous les tests sont verts.`;
} else {
  status = "alerte";
  summary = `${failed.length} contrôle(s) en échec que l'agent n'a pas pu corriger seul : votre attention est requise.`;
}
const details = [...failed.map((f) => `Échec : ${f}`), ...(note ? note.split("\n").filter(Boolean).slice(0, 12) : [])];
const link = pr || process.env.RUN_URL || undefined;

// 1. JOURNAL.md
const day = new Date().toISOString().slice(0, 10);
const journal = fs.readFileSync("JOURNAL.md", "utf8");
const heading = "## Maintenance quotidienne";
const line = `- ${day} — ${summary}${failed.length ? ` (${failed.join(" ; ")})` : ""}${link ? ` — ${link}` : ""}`;
const next = journal.includes(heading) ? journal.replace(heading, `${heading}\n${line}`) : `${journal.trimEnd()}\n\n${heading}\n${line}\n`;
fs.writeFileSync("JOURNAL.md", next);
console.log(line);

// 2. tableau de bord Atelier
const site = process.env.SITE_URL;
if (site && process.env.CRON_SECRET) {
  const res = await fetch(new URL("/api/cron/maintenance", site), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status, summary, details, link }),
  }).catch((e) => ({ ok: false, status: e.message }));
  console.log(res.ok ? "Rapport déposé dans l'Atelier." : `Rapport non déposé dans l'Atelier (${res.status}).`);
}
fs.writeFileSync("maintenance/statut.txt", status);
