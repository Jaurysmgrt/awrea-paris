#!/usr/bin/env node
/**
 * Bilan quotidien de l'agent de maintenance (.github/workflows/maintenance.yml).
 * Lance chaque vérification sans s'arrêter à la première erreur, puis écrit :
 *  - maintenance/bilan.json : { status: "ok" | "echec", checks: [{ name, ok, minutes, tail }] }
 *  - maintenance/bilan.md   : le même bilan, lisible (repris par Claude Code pour réparer).
 * Vérifications : lint, types, homogénéité du design, écriture de la créatrice, tests unitaires,
 * base clientes, compilation, parcours complets (démonstration), contrôle de sécurité, parcours et
 * écriture du site en ligne, textes produits par les agents et l'assistante (signalés sans bloquer :
 * ce sont des données, que la créatrice relit dans l'Atelier).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const site = process.env.SITE_URL ?? "https://www.awreaparis.com";
const online = process.env.SKIP_ONLINE !== "1";

const checks = [
  { name: "Lint", cmd: "npm run lint" },
  { name: "Types", cmd: "npm run typecheck" },
  { name: "Homogénéité du design system", cmd: "npm run audit:tokens" },
  { name: "Écriture de la créatrice (tirets, formulations interdites, typographie)", cmd: "npm run audit:ecriture -- --json maintenance/ecriture.json" },
  { name: "Tests unitaires (garde-fous IA)", cmd: "npm run test:unit" },
  { name: "Base clientes et sécurité par ligne", cmd: "npm run test:db" },
  { name: "Clés secrètes absentes du dépôt", cmd: "node scripts/secret-scan.mjs" },
  { name: "Compilation", cmd: "npm run build" },
  { name: "Parcours complets (démonstration, bureau et mobile)", cmd: "npx playwright test --reporter=line" },
  ...(online
    ? [
        { name: "Sécurité du site en ligne (TLS, HTTPS, en-têtes, vulnérabilités, intrusions)", cmd: `node scripts/security-check.mjs ${site} --json maintenance/securite.json` },
        { name: "Parcours du site en ligne (sans rien modifier)", cmd: "npx playwright test production-smoke --project=desktop --reporter=line", env: { BASE_URL: site } },
        { name: "Écriture des pages en ligne", cmd: `npm run audit:ecriture -- --site ${site}` },
        {
          name: "Textes des agents et de l'assistante (à relire dans l'Atelier)",
          cmd: `curl -sf -H "Authorization: Bearer $CRON_SECRET" ${site}/api/cron/ecriture | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(JSON.stringify(r,null,1).slice(0,6000));process.exit(r.aRelire?1:0)})"`,
          warnOnly: true,
        },
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
  results.push({ name: c.name, cmd: c.cmd, ok, warnOnly: Boolean(c.warnOnly), minutes: Math.round((Date.now() - started) / 600) / 100, tail: out.split("\n").slice(-60).join("\n") });
  console.log(`${ok ? "✓" : c.warnOnly ? "⚠" : "✗"} ${c.name}`);
}

const status = results.every((r) => r.ok || r.warnOnly) ? "ok" : "echec";
fs.writeFileSync("maintenance/bilan.json", JSON.stringify({ date: new Date().toISOString(), site, status, checks: results }, null, 2));
fs.writeFileSync(
  "maintenance/bilan.md",
  [
    `# Bilan de maintenance — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Statut : **${status === "ok" ? "tout est vert" : "échec"}** — site contrôlé : ${site}`,
    "",
    ...results.map((r) => `- ${r.ok ? "✓" : r.warnOnly ? "⚠" : "✗"} ${r.name} (\`${r.cmd}\`, ${r.minutes} min)`),
    "",
    ...results
      .filter((r) => !r.ok)
      .flatMap((r) => [`## ${r.warnOnly ? "⚠ À relire (ne rien modifier : textes stockés, la créatrice décide)" : "✗"} ${r.name}`, "", "```", r.tail, "```", ""]),
  ].join("\n"),
);
console.log(`Bilan : ${status}`);
