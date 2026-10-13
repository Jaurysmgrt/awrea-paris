#!/usr/bin/env node
/**
 * Bilan quotidien de l'agent de maintenance (.github/workflows/maintenance.yml).
 * Lance chaque vérification sans s'arrêter à la première erreur, puis écrit :
 *  - maintenance/bilan.json : { status: "ok" | "echec", checks: [{ name, ok, minutes, tail }] }
 *  - maintenance/bilan.md   : le même bilan, lisible (repris par Claude Code pour réparer).
 * Vérifications : lint, types, homogénéité du design, tests unitaires, base clientes,
 * compilation, parcours complets (démonstration), contrôle de sécurité et parcours du site en ligne.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const site = process.env.SITE_URL ?? "https://www.awreaparis.com";
const online = process.env.SKIP_ONLINE !== "1";

const checks = [
  { name: "Lint", cmd: "npm run lint" },
  { name: "Types", cmd: "npm run typecheck" },
  { name: "Homogénéité du design system", cmd: "npm run audit:tokens" },
  { name: "Tests unitaires (garde-fous IA)", cmd: "npm run test:unit" },
  { name: "Base clientes et sécurité par ligne", cmd: "npm run test:db" },
  { name: "Clés secrètes absentes du dépôt", cmd: "node scripts/secret-scan.mjs" },
  { name: "Compilation", cmd: "npm run build" },
  { name: "Parcours complets (démonstration, bureau et mobile)", cmd: "npx playwright test --reporter=line" },
  ...(online
    ? [
        { name: "Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions)", cmd: `node scripts/security-check.mjs ${site} --json maintenance/securite.json` },
        { name: "Parcours du site en ligne (sans rien modifier)", cmd: "npx playwright test production-smoke --project=desktop --reporter=line", env: { BASE_URL: site } },
      ]
    : []),
];

fs.mkdirSync("maintenance", { recursive: true });
const results = [];
for (const c of checks) {
  const started = Date.now();
  const r = spawnSync("bash", ["-lc", c.cmd], { encoding: "utf8", env: { ...process.env, ...(c.env ?? {}), CI: "1" }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim();
  const ok = r.status === 0;
  results.push({ name: c.name, cmd: c.cmd, ok, minutes: Math.round((Date.now() - started) / 600) / 100, tail: out.split("\n").slice(-60).join("\n") });
  console.log(`${ok ? "✓" : "✗"} ${c.name}`);
}

const status = results.every((r) => r.ok) ? "ok" : "echec";
fs.writeFileSync("maintenance/bilan.json", JSON.stringify({ date: new Date().toISOString(), site, status, checks: results }, null, 2));
fs.writeFileSync(
  "maintenance/bilan.md",
  [
    `# Bilan de maintenance — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Statut : **${status === "ok" ? "tout est vert" : "échec"}** — site contrôlé : ${site}`,
    "",
    ...results.map((r) => `- ${r.ok ? "✓" : "✗"} ${r.name} (\`${r.cmd}\`, ${r.minutes} min)`),
    "",
    ...results
      .filter((r) => !r.ok)
      .flatMap((r) => [`## ✗ ${r.name}`, "", "```", r.tail, "```", ""]),
  ].join("\n"),
);
console.log(`Bilan : ${status}`);
