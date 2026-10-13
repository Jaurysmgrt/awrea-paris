#!/usr/bin/env node
/**
 * Audit d'homogénéité du design system.
 * Signale toute valeur écrite en dur hors de styles/tokens.css :
 *   couleurs (#hex, rgb, hsl), tailles (px, rem, em hors letter-spacing), durées, courbes,
 *   styles en ligne et valeurs arbitraires Tailwind dans les composants.
 * Une ligne peut être exemptée explicitement avec le commentaire « token-ok » (cas justifiés :
 * unités du viewBox SVG, tuile de texture…).
 * Vérifie aussi que styles/tokens.ts (miroir pour e-mails, WebGL, métadonnées) correspond au CSS.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const problems = [];
const report = (file, line, msg, text) => problems.push(`${path.relative(root, file)}:${line}  ${msg}  →  ${text.trim().slice(0, 110)}`);

// ------------------------------------------------------------------ CSS
const cssDir = path.join(root, "styles");
// les media queries ne peuvent pas lire de variables CSS : leurs valeurs doivent être
// exactement les points de rupture du design system (min) ou leur valeur − 0,01 rem (max)
const tokensCss = fs.readFileSync(path.join(cssDir, "tokens.css"), "utf8");
const breakpoints = [...tokensCss.matchAll(/--breakpoint-[a-z0-9]+:\s*([\d.]+)rem/g)].map((m) => parseFloat(m[1]));
const allowedMedia = new Set(breakpoints.flatMap((b) => [String(b), (b - 0.01).toFixed(2)]));
for (const f of fs.readdirSync(cssDir).filter((f) => f.endsWith(".css") && f !== "tokens.css")) {
  const file = path.join(cssDir, f);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((raw, i) => {
    if (raw.includes("token-ok")) return;
    const line = raw.replace(/\/\*.*?\*\//g, "").replace(/url\([^)]*\)/g, "");
    if (/^\s*@media/.test(line)) {
      for (const m of line.matchAll(/([\d.]+)rem/g)) if (!allowedMedia.has(String(parseFloat(m[1]))) && !allowedMedia.has(parseFloat(m[1]).toFixed(2))) report(file, i + 1, "point de rupture hors tokens", raw);
      return;
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(line)) report(file, i + 1, "couleur en dur", raw);
    if (/\b(rgb|rgba|hsl|hsla)\(/.test(line)) report(file, i + 1, "couleur en dur", raw);
    if (/cubic-bezier\(/.test(line)) report(file, i + 1, "courbe en dur", raw);
    if (/(transition|animation)[^:]*:[^;]*\b\d*\.?\d+m?s\b/.test(line) && !/var\(--dur/.test(line)) report(file, i + 1, "durée en dur", raw);
    if (/:\s*[^;]*\b\d*\.?\d+px\b/.test(line)) report(file, i + 1, "px en dur", raw);
    if (/:\s*[^;]*\b\d*\.?\d+rem\b/.test(line)) report(file, i + 1, "rem en dur", raw);
    if (/^\s*letter-spacing:\s*-?\d/.test(line) && !/:\s*0;/.test(line)) report(file, i + 1, "interlettrage en dur", raw);
    if (/^\s*font-size:\s*\d/.test(line)) report(file, i + 1, "taille de police en dur", raw);
  });
}

// ------------------------------------------------- composants et pages
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const allowColorFiles = new Set(["styles/tokens.ts"]);
for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "components"))]) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((raw, i) => {
    if (raw.includes("token-ok")) return;
    if (!allowColorFiles.has(rel) && /["'`]#[0-9a-fA-F]{3,8}["'`]/.test(raw)) report(file, i + 1, "couleur en dur dans un composant", raw);
    if (/className=["{][^"}]*\b[a-z-]+-\[[^\]]+\]/.test(raw)) report(file, i + 1, "valeur arbitraire Tailwind", raw);
    const style = raw.match(/style=\{\{([^}]*)\}\}/);
    if (style && /\b\d+(px|rem|em|ms|s)\b|#[0-9a-f]{3,6}/i.test(style[1])) report(file, i + 1, "style en ligne avec valeur en dur", raw);
  });
}

// ------------------------------------------- miroir TypeScript des couleurs
const css = fs.readFileSync(path.join(cssDir, "tokens.css"), "utf8");
const ts = fs.readFileSync(path.join(root, "styles/tokens.ts"), "utf8");
for (const name of ["ink", "ivory", "pearl", "gold"]) {
  const a = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();
  const b = ts.match(new RegExp(`${name}:\\s*"(#[0-9a-fA-F]{6})"`))?.[1]?.toLowerCase();
  if (!a || a !== b) problems.push(`styles/tokens.ts  couleur « ${name} » différente du CSS (${b} ≠ ${a})`);
}

if (problems.length) {
  console.log(`Audit d'homogénéité : ${problems.length} écart(s)\n`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("Audit d'homogénéité : aucun écart. Toutes les valeurs passent par le design system.");
